"""
WebSocket 실시간 업데이트 예제

이 예제는 WebSocket을 통해 실시간 업데이트를 수신하는
방법을 보여줍니다.

@spec ADRL-0004
"""

import asyncio
import os
import logging
from zkest_sdk.websocket import VerificationStream
from zkest_sdk.types import Verification, Tier

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def main():
    # 환경 변수에서 설정 로드
    ws_url = os.getenv("ZKEST_WS_URL", "ws://localhost:3000")
    agent_id = os.getenv("ZKEST_AGENT_ID", "agent-001")
    api_key = os.getenv("ZKEST_API_KEY")

    # WebSocket 스트림 생성
    stream = VerificationStream(
        ws_url=ws_url,
        agent_id=agent_id,
        api_key=api_key,
    )

    # 이벤트 핸들러 등록
    @stream.on("verification_submitted")
    async def on_verification_submitted(data: dict):
        """새 검증 요청 수신"""
        logger.info(f"새 검증 요청: {data}")

    @stream.on("verification_approved")
    async def on_verification_approved(data: dict):
        """검증 승인 수신"""
        logger.info(f"검증 승인: {data}")
        # 티어 업데이트 확인
        if "tier" in data:
            logger.info(f"새로운 티어: {data['tier']}")

    @stream.on("verification_rejected")
    async def on_verification_rejected(data: dict):
        """검증 거절 수신"""
        logger.warning(f"검증 거절: {data}")
        if "reason" in data:
            logger.warning(f"거절 사유: {data['reason']}")

    @stream.on("tier_updated")
    async def on_tier_updated(data: dict):
        """티어 업데이트 수신"""
        logger.info(f"티어 업데이트: {data}")
        tier = Tier(data.get("tier", "Unverified"))
        logger.info(f"현재 티어: {tier.value}")

    @stream.on("escrow_created")
    async def on_escrow_created(data: dict):
        """에스크로 생성 수신"""
        logger.info(f"새 에스크로: {data}")

    @stream.on("escrow_completed")
    async def on_escrow_completed(data: dict):
        """에스크로 완료 수신"""
        logger.info(f"에스크로 완료: {data}")

    # 연결 및 구독
    await stream.connect()
    await stream.join_agent_room(agent_id)
    await stream.subscribe_to_verifications(agent_id)
    await stream.subscribe_to_escrows(agent_id)

    logger.info("WebSocket 연결 완료, 이벤트 대기 중...")

    try:
        # 무한 루프 (Ctrl+C로 종료)
        while stream.connected():
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        logger.info("종료 신호 수신")
    finally:
        await stream.disconnect()
        logger.info("WebSocket 연결 해제")


if __name__ == "__main__":
    asyncio.run(main())
