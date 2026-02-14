"""
Zkest API 클라이언트

동기 및 비동기 HTTP 클라이언트를 제공합니다.

@spec ADRL-0004
"""

import json
from typing import Optional, Dict, Any, List
from datetime import datetime

import aiohttp
import requests

from zkest_sdk.exceptions import APIError, AuthenticationError
from zkest_sdk.types import (
    VerificationStatus,
    Tier,
    Verification,
    AgentMetrics,
    Task,
)


class ZkestClient:
    """
    동기 Zkest API 클라이언트
    """

    def __init__(
        self,
        api_url: str,
        api_key: Optional[str] = None,
        agent_id: Optional[str] = None,
        private_key: Optional[str] = None,
        timeout: int = 30,
    ):
        """
        클라이언트 초기화

        Args:
            api_url: API 베이스 URL (예: "https://api.agentdeal.com")
            api_key: API 키 (선택 사항)
            agent_id: 에이전트 ID (선택 사항)
            private_key: 프라이빗 키 (선택 사항, 서명용)
            timeout: 요청 타임아웃 (초)
        """
        self.api_url = api_url.rstrip("/")
        self.api_key = api_key
        self.agent_id = agent_id
        self.private_key = private_key
        self.timeout = timeout
        self._session = requests.Session()

        if api_key:
            self._session.headers.update({"Authorization": f"Bearer {api_key}"})

    def _get_headers(self) -> Dict[str, str]:
        """요청 헤더 생성"""
        headers = {
            "Content-Type": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def _handle_response(self, response: requests.Response) -> Dict[str, Any]:
        """응답 처리 및 오류 확인"""
        if response.status_code == 401:
            raise AuthenticationError("인증이 실패했습니다. API 키를 확인하세요.")
        elif response.status_code == 404:
            raise APIError("요청한 리소스를 찾을 수 없습니다.", response.status_code)
        elif response.status_code >= 400:
            try:
                data = response.json()
                message = data.get("message", "API 요청이 실패했습니다.")
            except:
                message = response.text or "API 요청이 실패했습니다."
            raise APIError(message, response.status_code, data if 'data' in locals() else None)

        return response.json()

    # 검증 관련 메서드

    def submit_verification(
        self,
        data: Dict[str, Any],
        token: Optional[str] = None,
    ) -> Verification:
        """
        검증 제출

        Args:
            data: 검증 데이터 {agent_id, skill, evidence_url, ...}
            token: JWT 토큰 (선택 사항)

        Returns:
            Verification 객체
        """
        headers = self._get_headers()
        if token:
            headers["Authorization"] = f"Bearer {token}"

        response = self._session.post(
            f"{self.api_url}/verifications",
            json=data,
            headers=headers,
            timeout=self.timeout,
        )
        result = self._handle_response(response)
        return Verification(**result)

    def get_pending_verifications(
        self,
        agent_id: Optional[str] = None,
        limit: int = 100,
    ) -> List[Verification]:
        """
        대기 중인 검증 목록 조회

        Args:
            agent_id: 에이전트 ID (선택 사항)
            limit: 최대 결과 수

        Returns:
            Verification 객체 리스트
        """
        headers = self._get_headers()
        params = {"limit": limit}
        if agent_id:
            params["agentId"] = agent_id

        response = self._session.get(
            f"{self.api_url}/verifications/pending",
            headers=headers,
            params=params,
            timeout=self.timeout,
        )
        result = self._handle_response(response)
        return [Verification(**item) for item in result.get("data", result)]

    def get_verification(self, verification_id: str) -> Verification:
        """
        검증 상세 조회

        Args:
            verification_id: 검증 ID

        Returns:
            Verification 객체
        """
        headers = self._get_headers()
        response = self._session.get(
            f"{self.api_url}/verifications/{verification_id}",
            headers=headers,
            timeout=self.timeout,
        )
        result = self._handle_response(response)
        return Verification(**result)

    def update_verification(
        self,
        verification_id: str,
        data: Dict[str, Any],
        token: Optional[str] = None,
    ) -> Verification:
        """
        검증 승인/거절

        Args:
            verification_id: 검증 ID
            data: 업데이트 데이터 {status, feedback, ...}
            token: JWT 토큰 (선택 사항)

        Returns:
            업데이트된 Verification 객체
        """
        headers = self._get_headers()
        if token:
            headers["Authorization"] = f"Bearer {token}"

        response = self._session.patch(
            f"{self.api_url}/verifications/{verification_id}",
            json=data,
            headers=headers,
            timeout=self.timeout,
        )
        result = self._handle_response(response)
        return Verification(**result)

    # 에이전트 관련 메서드

    def get_agent_metrics(self, agent_id: str) -> AgentMetrics:
        """
        에이전트 메트릭 조회

        Args:
            agent_id: 에이전트 ID

        Returns:
            AgentMetrics 객체
        """
        headers = self._get_headers()
        response = self._session.get(
            f"{self.api_url}/agents/{agent_id}/metrics",
            headers=headers,
            timeout=self.timeout,
        )
        result = self._handle_response(response)

        return AgentMetrics(
            agent_id=result.get("agentId", agent_id),
            tier=Tier(result.get("tier", "Unverified")),
            reputation_score=result.get("reputationScore", 0),
            completed_tasks=result.get("completedTasks", 0),
            total_earnings=result.get("totalEarnings", 0),
            skills=result.get("skills", []),
            verification_count=result.get("verificationCount", 0),
            accuracy=result.get("accuracy"),
        )

    def update_reputation(
        self,
        agent_id: str,
        data: Dict[str, Any],
        token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        평판 업데이트

        Args:
            agent_id: 에이전트 ID
            data: 평판 데이터 {rating, on_time, disputed, ...}
            token: JWT 토큰 (선택 사항)

        Returns:
            업데이트 결과
        """
        headers = self._get_headers()
        if token:
            headers["Authorization"] = f"Bearer {token}"

        response = self._session.post(
            f"{self.api_url}/agents/{agent_id}/reputation",
            json=data,
            headers=headers,
            timeout=self.timeout,
        )
        return self._handle_response(response)

    def get_tier_history(self, agent_id: str) -> List[Dict[str, Any]]:
        """
        티어 변경 내역 조회

        Args:
            agent_id: 에이전트 ID

        Returns:
            티어 변경 내역 리스트
        """
        headers = self._get_headers()
        response = self._session.get(
            f"{self.api_url}/agents/{agent_id}/tier/history",
            headers=headers,
            timeout=self.timeout,
        )
        result = self._handle_response(response)
        return result.get("data", result)

    def set_tier(
        self,
        agent_id: str,
        tier: Tier,
        reason: str,
        token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        티어 설정

        Args:
            agent_id: 에이전트 ID
            tier: 새로운 티어
            reason: 변경 사유
            token: JWT 토큰 (선택 사항)

        Returns:
            설정 결과
        """
        headers = self._get_headers()
        if token:
            headers["Authorization"] = f"Bearer {token}"

        response = self._session.post(
            f"{self.api_url}/agents/{agent_id}/tier",
            json={"tier": tier.value, "reason": reason},
            headers=headers,
            timeout=self.timeout,
        )
        return self._handle_response(response)

    # 작업 관련 메서드

    def get_tasks(
        self,
        status: Optional[str] = None,
        skill: Optional[str] = None,
        limit: int = 100,
    ) -> List[Task]:
        """
        작업 목록 조회

        Args:
            status: 작업 상태 필터
            skill: 필요 스킬 필터
            limit: 최대 결과 수

        Returns:
            Task 객체 리스트
        """
        headers = self._get_headers()
        params = {"limit": limit}
        if status:
            params["status"] = status
        if skill:
            params["skill"] = skill

        response = self._session.get(
            f"{self.api_url}/tasks",
            headers=headers,
            params=params,
            timeout=self.timeout,
        )
        result = self._handle_response(response)
        return [Task(**item) for item in result.get("data", result)]

    def get_task(self, task_id: str) -> Task:
        """
        작업 상세 조회

        Args:
            task_id: 작업 ID

        Returns:
            Task 객체
        """
        headers = self._get_headers()
        response = self._session.get(
            f"{self.api_url}/tasks/{task_id}",
            headers=headers,
            timeout=self.timeout,
        )
        result = self._handle_response(response)
        return Task(**result)

    def close(self):
        """세션 종료"""
        self._session.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


class AsyncZkestClient:
    """
    비동기 Zkest API 클라이언트
    """

    def __init__(
        self,
        api_url: str,
        api_key: Optional[str] = None,
        agent_id: Optional[str] = None,
        private_key: Optional[str] = None,
        timeout: int = 30,
    ):
        """
        클라이언트 초기화

        Args:
            api_url: API 베이스 URL
            api_key: API 키 (선택 사항)
            agent_id: 에이전트 ID (선택 사항)
            private_key: 프라이빗 키 (선택 사항)
            timeout: 요청 타임아웃 (초)
        """
        self.api_url = api_url.rstrip("/")
        self.api_key = api_key
        self.agent_id = agent_id
        self.private_key = private_key
        self.timeout = aiohttp.ClientTimeout(total=timeout)
        self._session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self) -> aiohttp.ClientSession:
        """세션 가져오기 (지연 초기화)"""
        if self._session is None or self._session.closed:
            headers = {}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
            self._session = aiohttp.ClientSession(headers=headers)
        return self._session

    async def _handle_response(self, response: aiohttp.ClientResponse) -> Dict[str, Any]:
        """응답 처리 및 오류 확인"""
        if response.status == 401:
            raise AuthenticationError("인증이 실패했습니다. API 키를 확인하세요.")
        elif response.status == 404:
            raise APIError("요청한 리소스를 찾을 수 없습니다.", response.status)
        elif response.status >= 400:
            try:
                data = await response.json()
                message = data.get("message", "API 요청이 실패했습니다.")
            except:
                message = await response.text()
            raise APIError(message, response.status, data if 'data' in locals() else None)

        return await response.json()

    # 검증 관련 메서드 (비동기)

    async def submit_verification(
        self,
        data: Dict[str, Any],
        token: Optional[str] = None,
    ) -> Verification:
        """검증 제출 (비동기)"""
        session = await self._get_session()
        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        elif self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        async with session.post(
            f"{self.api_url}/verifications",
            json=data,
            headers=headers,
            timeout=self.timeout,
        ) as response:
            result = await self._handle_response(response)
            return Verification(**result)

    async def get_pending_verifications(
        self,
        agent_id: Optional[str] = None,
        limit: int = 100,
    ) -> List[Verification]:
        """대기 중인 검증 목록 조회 (비동기)"""
        session = await self._get_session()
        params = {"limit": limit}
        if agent_id:
            params["agentId"] = agent_id

        async with session.get(
            f"{self.api_url}/verifications/pending",
            params=params,
            timeout=self.timeout,
        ) as response:
            result = await self._handle_response(response)
            return [Verification(**item) for item in result.get("data", result)]

    async def get_verification(self, verification_id: str) -> Verification:
        """검증 상세 조회 (비동기)"""
        session = await self._get_session()
        async with session.get(
            f"{self.api_url}/verifications/{verification_id}",
            timeout=self.timeout,
        ) as response:
            result = await self._handle_response(response)
            return Verification(**result)

    async def get_agent_metrics(self, agent_id: str) -> AgentMetrics:
        """에이전트 메트릭 조회 (비동기)"""
        session = await self._get_session()
        async with session.get(
            f"{self.api_url}/agents/{agent_id}/metrics",
            timeout=self.timeout,
        ) as response:
            result = await self._handle_response(response)
            return AgentMetrics(
                agent_id=result.get("agentId", agent_id),
                tier=Tier(result.get("tier", "Unverified")),
                reputation_score=result.get("reputationScore", 0),
                completed_tasks=result.get("completedTasks", 0),
                total_earnings=result.get("totalEarnings", 0),
                skills=result.get("skills", []),
                verification_count=result.get("verificationCount", 0),
                accuracy=result.get("accuracy"),
            )

    async def close(self):
        """세션 종료"""
        if self._session and not self._session.closed:
            await self._session.close()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
