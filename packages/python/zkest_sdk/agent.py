"""
Zkest Agent 클래스

자동 검증 에이전트 및 자동 승인 에이전트를 제공합니다.

@spec ADRL-0004
"""

import asyncio
import logging
from typing import Optional, Dict, Any, Callable, Awaitable
from datetime import datetime

from zkest_sdk.client import AsyncZkestClient
from zkest_sdk.types import (
    VerificationStatus,
    Tier,
    TaskType,
    VerificationResult,
    ValidationResult,
    Verification,
    Task,
)
from zkest_sdk.exceptions import ZkestError, ValidationError

logger = logging.getLogger(__name__)


VerificationCallback = Callable[[Dict[str, Any]], Awaitable[VerificationResult]]
ValidationCallback = Callable[[Dict[str, Any]], Awaitable[ValidationResult]]


class AutoVerifier:
    """
    자동 검증 에이전트

    검증 요청을 자동으로 수신하고 처리합니다.
    """

    def __init__(
        self,
        client: AsyncZkestClient,
        poll_interval: float = 5.0,
    ):
        """
        자동 검증자 초기화

        Args:
            client: 비동기 API 클라이언트
            poll_interval: 폴링 간격 (초)
        """
        self.client = client
        self.poll_interval = poll_interval
        self._callbacks: Dict[str, VerificationCallback] = {}
        self._running = False
        self._task: Optional[asyncio.Task] = None

    def register_callback(
        self,
        skill: str,
        callback: VerificationCallback,
    ) -> None:
        """
        스킬별 검증 콜백 등록

        Args:
            skill: 스킬 이름 (예: "python", "typescript")
            callback: 검증 콜백 함수
        """
        self._callbacks[skill] = callback
        logger.info(f"콜백 등록됨: {skill}")

    def unregister_callback(self, skill: str) -> None:
        """
        스킬별 콜백 제거

        Args:
            skill: 스킬 이름
        """
        if skill in self._callbacks:
            del self._callbacks[skill]
            logger.info(f"콜백 제거됨: {skill}")

    async def verify_task(self, task: Dict[str, Any]) -> VerificationResult:
        """
        작업 검증 실행

        Args:
            task: 작업 정보

        Returns:
            검증 결과
        """
        skill = task.get("skill", task.get("taskType", "other"))
        callback = self._callbacks.get(skill)

        if callback:
            try:
                return await callback(task)
            except Exception as e:
                logger.error(f"검증 콜백 실행 중 오류: {e}")
                return VerificationResult(
                    valid=False,
                    score=0,
                    feedback=f"검증 중 오류 발생: {str(e)}",
                )
        else:
            # 기본 검증 로직
            return await self._default_verification(task)

    async def _default_verification(self, task: Dict[str, Any]) -> VerificationResult:
        """
        기본 검증 로직

        Args:
            task: 작업 정보

        Returns:
            검증 결과
        """
        # 기본적으로 승인하지만, 낮은 점수 부여
        return VerificationResult(
            valid=True,
            score=70,
            feedback="자동 검증 완료",
        )

    async def submit_verification(
        self,
        task_id: str,
        result: VerificationResult,
    ) -> Verification:
        """
        검증 결과 제출

        Args:
            task_id: 작업 ID
            result: 검증 결과

        Returns:
            업데이트된 검증 정보
        """
        data = {
            "status": VerificationStatus.APPROVED if result.valid else VerificationStatus.REJECTED,
            "score": result.score,
            "feedback": result.feedback,
            "evidence": result.evidence,
            "metadata": result.metadata,
        }
        return await self.client.update_verification(task_id, data)

    async def start(self) -> None:
        """자동 검증 시작"""
        if self._running:
            logger.warning("이미 실행 중입니다.")
            return

        self._running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info("자동 검증 시작")

    async def stop(self) -> None:
        """자동 검증 중지"""
        if not self._running:
            return

        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("자동 검증 중지")

    async def _run_loop(self) -> None:
        """검증 루프"""
        while self._running:
            try:
                verifications = await self.client.get_pending_verifications(
                    agent_id=self.client.agent_id,
                )

                for verification in verifications:
                    if not self._running:
                        break

                    try:
                        task_data = {
                            "id": verification.id,
                            "agent_id": verification.agent_id,
                            "skill": verification.skill,
                            "evidence_url": verification.evidence_url,
                        }

                        result = await self.verify_task(task_data)
                        await self.submit_verification(verification.id, result)
                        logger.info(f"검증 완료: {verification.id}")

                    except Exception as e:
                        logger.error(f"검증 처리 중 오류 ({verification.id}): {e}")

            except Exception as e:
                logger.error(f"폴링 중 오류: {e}")

            await asyncio.sleep(self.poll_interval)


class AutoApprover:
    """
    자동 승인 에이전트

    검증이 완료된 작업을 자동으로 승인합니다.
    """

    def __init__(
        self,
        client: AsyncZkestClient,
        poll_interval: float = 5.0,
    ):
        """
        자동 승인자 초기화

        Args:
            client: 비동기 API 클라이언트
            poll_interval: 폴링 간격 (초)
        """
        self.client = client
        self.poll_interval = poll_interval
        self._callbacks: Dict[str, ValidationCallback] = {}
        self._running = False
        self._task: Optional[asyncio.Task] = None

    def register_callback(
        self,
        skill: str,
        callback: ValidationCallback,
    ) -> None:
        """
        스킬별 승인 콜백 등록

        Args:
            skill: 스킬 이름
            callback: 승인 콜백 함수
        """
        self._callbacks[skill] = callback
        logger.info(f"승인 콜백 등록됨: {skill}")

    def unregister_callback(self, skill: str) -> None:
        """
        스킬별 콜백 제거

        Args:
            skill: 스킬 이름
        """
        if skill in self._callbacks:
            del self._callbacks[skill]
            logger.info(f"승인 콜백 제거됨: {skill}")

    async def validate_result(self, task: Dict[str, Any]) -> ValidationResult:
        """
        결과 검증 실행

        Args:
            task: 작업 정보

        Returns:
            검증 결과
        """
        skill = task.get("skill", task.get("taskType", "other"))
        callback = self._callbacks.get(skill)

        if callback:
            try:
                return await callback(task)
            except Exception as e:
                logger.error(f"검증 콜백 실행 중 오류: {e}")
                return ValidationResult(
                    valid=False,
                    reason=f"검증 중 오류 발생: {str(e)}",
                )
        else:
            # 기본 검증 로직
            return ValidationResult(valid=True)

    async def approve(self, task_id: str) -> Dict[str, Any]:
        """
        작업 승인

        Args:
            task_id: 작업 ID

        Returns:
            승인 결과
        """
        data = {"status": "approved", "approvedAt": datetime.utcnow().isoformat()}
        return await self.client.update_verification(task_id, data)

    async def reject(self, task_id: str, reason: str) -> Dict[str, Any]:
        """
        작업 거절

        Args:
            task_id: 작업 ID
            reason: 거절 사유

        Returns:
            거절 결과
        """
        data = {
            "status": "rejected",
            "rejectionReason": reason,
            "rejectedAt": datetime.utcnow().isoformat(),
        }
        return await self.client.update_verification(task_id, data)

    async def start(self) -> None:
        """자동 승인 시작"""
        if self._running:
            logger.warning("이미 실행 중입니다.")
            return

        self._running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info("자동 승인 시작")

    async def stop(self) -> None:
        """자동 승인 중지"""
        if not self._running:
            return

        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("자동 승인 중지")

    async def _run_loop(self) -> None:
        """승인 루프"""
        while self._running:
            try:
                # 승인 대기 중인 작업 조회
                verifications = await self.client.get_pending_verifications()

                for verification in verifications:
                    if not self._running:
                        break

                    # 승인된 검증만 처리
                    if verification.status == VerificationStatus.APPROVED:
                        try:
                            task_data = {
                                "id": verification.id,
                                "agent_id": verification.agent_id,
                                "skill": verification.skill,
                                "score": verification.score,
                                "feedback": verification.feedback,
                            }

                            result = await self.validate_result(task_data)

                            if result.valid:
                                await self.approve(verification.id)
                                logger.info(f"승인 완료: {verification.id}")
                            else:
                                await self.reject(verification.id, result.reason or "검증 실패")
                                logger.info(f"거절 완료: {verification.id}")

                        except Exception as e:
                            logger.error(f"승인 처리 중 오류 ({verification.id}): {e}")

            except Exception as e:
                logger.error(f"폴링 중 오류: {e}")

            await asyncio.sleep(self.poll_interval)
