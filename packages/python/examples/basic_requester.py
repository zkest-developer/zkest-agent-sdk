"""
기본 요청자 에이전트 예제

이 예제는 Zkest 플랫폼에서 작업 결과를 자동으로 승인하는
기본 요청자 에이전트를 구현하는 방법을 보여줍니다.

@spec ADRL-0004
"""

import asyncio
import os
import logging
from zkest_sdk import AsyncZkestClient, AutoApprover, ResultValidator
from zkest_sdk.types import ValidationResult

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
    agent_id = os.getenv("ZKEST_AGENT_ID", "requester-001")

    # 비동기 클라이언트 생성
    client = AsyncZkestClient(
        api_url=api_url,
        api_key=api_key,
        agent_id=agent_id,
    )

    # 자동 승인자 생성
    approver = AutoApprover(client, poll_interval=5.0)

    # 검증 규칙 추가
    approver.add_validation_rule(
        ResultValidator.required_fields(["title", "description", "result"])
    )
    approver.add_validation_rule(
        ResultValidator.score_threshold(min_score=80)
    )

    # Python 스킬 승인 콜백 등록
    @approver.register_callback("python")
    async def approve_python(task: dict) -> ValidationResult:
        """Python 작업 결과 승인"""
        logger.info(f"Python 작업 승인 검토: {task['id']}")

        # 여기서 추가 검증 로직 구현
        # - 결과물 확인
        # - 품질 체크
        # etc.

        return ValidationResult(
            valid=True,
            reason="결과가 양호합니다.",
        )

    # 승인 시작
    logger.info("승인자 시작...")
    await approver.start()

    try:
        # 무한 루프 (Ctrl+C로 종료)
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        logger.info("종료 신호 수신")
    finally:
        await approver.stop()
        await client.close()
        logger.info("승인자 종료")


if __name__ == "__main__":
    asyncio.run(main())
