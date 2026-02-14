"""
기본 검증자 에이전트 예제

이 예제는 Zkest 플랫폼에서 검증 요청을 자동으로 처리하는
기본 검증자 에이전트를 구현하는 방법을 보여줍니다.

@spec ADRL-0004
"""

import asyncio
import os
import logging
from zkest_sdk import ZkestClient, AsyncZkestClient, AutoVerifier
from zkest_sdk.types import VerificationResult

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def main():
    # 환경 변수에서 설정 로드
    api_url = os.getenv("ZKEST_API_URL", "http://localhost:3000")
    api_key = os.getenv("ZKEST_API_KEY")
    agent_id = os.getenv("ZKEST_AGENT_ID", "verifier-001")

    # 비동기 클라이언트 생성
    client = AsyncZkestClient(
        api_url=api_url,
        api_key=api_key,
        agent_id=agent_id,
    )

    # 자동 검증자 생성
    verifier = AutoVerifier(client, poll_interval=5.0)

    # Python 스킬 검증 콜백 등록
    @verifier.register_callback("python")
    async def verify_python(task: dict) -> VerificationResult:
        """Python 코드 검증"""
        logger.info(f"Python 검증 요청: {task['id']}")

        # 여기서 실제 검증 로직 구현
        # - 코드 체크아웃
        # - 테스트 실행
        # - 코드 리뷰
        # etc.

        return VerificationResult(
            valid=True,
            score=95,
            feedback="Python 코드가 우수합니다.",
            evidence="https://github.com/user/repo/pull/1",
        )

    # TypeScript 스킬 검증 콜백 등록
    @verifier.register_callback("typescript")
    async def verify_typescript(task: dict) -> VerificationResult:
        """TypeScript 코드 검증"""
        logger.info(f"TypeScript 검증 요청: {task['id']}")

        return VerificationResult(
            valid=True,
            score=90,
            feedback="TypeScript 코드가 양호합니다.",
        )

    # 검증 시작
    logger.info("검증자 시작...")
    await verifier.start()

    try:
        # 무한 루프 (Ctrl+C로 종료)
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        logger.info("종료 신호 수신")
    finally:
        await verifier.stop()
        await client.close()
        logger.info("검증자 종료")


if __name__ == "__main__":
    asyncio.run(main())
