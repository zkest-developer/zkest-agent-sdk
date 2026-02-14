"""
커스텀 검증 로직 예제

이 예제는 사용자 정의 검증 로직을 구현하는 방법을 보여줍니다.

@spec ADRL-0004
"""

import asyncio
import os
import logging
from zkest_sdk import AsyncZkestClient, AutoVerifier, ResultValidator
from zkest_sdk.types import VerificationResult, ValidationResult

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def verify_code_quality(task: dict) -> VerificationResult:
    """
    코드 품질 검증

    Args:
        task: 작업 정보

    Returns:
        검증 결과
    """
    logger.info(f"코드 품질 검증 시작: {task['id']}")

    # 실제 구현에서는:
    # 1. 코드 체크아웃
    # 2. 정적 분석 도구 실행 (pylint, mypy, etc.)
    # 3. 테스트 커버리지 확인
    # 4. 코드 스타일 검사

    # 예: 가상의 코드 점수 계산
    score = 85
    issues = []

    # pylint 점수 (0-10)
    pylint_score = 8.5
    if pylint_score < 7:
        issues.append(f"Pylint 점수 낮음: {pylint_score}")

    # 테스트 커버리지 (%)
    coverage = 75
    if coverage < 80:
        issues.append(f"테스트 커버리지 낮음: {coverage}%")

    return VerificationResult(
        valid=len(issues) == 0,
        score=score,
        feedback="코드 품질 양호" if not issues else f"문제점: {', '.join(issues)}",
        metadata={
            "pylint_score": pylint_score,
            "coverage": coverage,
            "issues": issues,
        },
    )


async def validate_result_with_schema(task: dict) -> ValidationResult:
    """
    스키마 기반 결과 검증

    Args:
        task: 작업 정보

    Returns:
        검증 결과
    """
    logger.info(f"스키마 검증 시작: {task['id']}")

    # 스키마 정의
    schema = {
        "title": {"type": "string", "required": True},
        "description": {"type": "string", "required": True, "minLength": 10},
        "code": {"type": "string", "required": True},
        "test_results": {
            "type": "array",
            "required": True,
        },
    }

    validator = ResultValidator()
    validator.add_validation_rule(ResultValidator.schema(schema))

    return validator.validate(task)


async def main():
    # 환경 변수에서 설정 로드
    api_url = os.getenv("ZKEST_API_URL", "http://localhost:3000")
    api_key = os.getenv("ZKEST_API_KEY")
    agent_id = os.getenv("ZKEST_AGENT_ID", "custom-verifier-001")

    # 비동기 클라이언트 생성
    client = AsyncZkestClient(
        api_url=api_url,
        api_key=api_key,
        agent_id=agent_id,
    )

    # 검증자 생성
    verifier = AutoVerifier(client, poll_interval=5.0)

    # 커스텀 검증 콜백 등록
    @verifier.register_callback("python")
    async def verify_python(task: dict) -> VerificationResult:
        """Python 코드 커스텀 검증"""
        return await verify_code_quality(task)

    @verifier.register_callback("typescript")
    async def verify_typescript(task: dict) -> VerificationResult:
        """TypeScript 코드 커스텀 검증"""
        # TypeScript별 검증 로직
        return VerificationResult(
            valid=True,
            score=88,
            feedback="TypeScript 코드 양호",
        )

    # 승인자 생성
    from zkest_sdk import AutoApprover
    approver = AutoApprover(client, poll_interval=5.0)

    # 커스텀 승인 콜백 등록
    @approver.register_callback("python")
    async def approve_python(task: dict) -> ValidationResult:
        """Python 작업 결과 커스텀 승인"""
        return await validate_result_with_schema(task)

    logger.info("커스텀 검증자/승인자 시작...")

    # 검증자와 승인자 동시 실행
    await verifier.start()
    await approver.start()

    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        logger.info("종료 신호 수신")
    finally:
        await verifier.stop()
        await approver.stop()
        await client.close()
        logger.info("종료 완료")


if __name__ == "__main__":
    asyncio.run(main())
