"""
결과물 검증 클래스

작업 결과물을 검증하는 규칙과 로직을 제공합니다.

@spec ADRL-0004
"""

import os
import re
import mimetypes
from typing import Optional, List, Dict, Any, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field

from zkest_sdk.types import ValidationResult


@dataclass
class ValidationRule:
    """검증 규칙"""

    name: str
    func: Callable[[Dict[str, Any]], ValidationResult]
    description: Optional[str] = None


class ResultValidator:
    """
    결과물 검증기

    다양한 검증 규칙을 등록하고 결과물을 검증합니다.
    """

    def __init__(self):
        """검증기 초기화"""
        self._rules: List[ValidationRule] = []

    def add_rule(self, rule: ValidationRule) -> None:
        """
        검증 규칙 추가

        Args:
            rule: 검증 규칙
        """
        self._rules.append(rule)

    def add_validation_rule(self, rule: ValidationRule) -> None:
        """
        검증 규칙 추가 (별칭)

        Args:
            rule: 검증 규칙
        """
        self.add_rule(rule)

    def remove_rule(self, name: str) -> bool:
        """
        검증 규칙 제거

        Args:
            name: 규칙 이름

        Returns:
            제거 성공 여부
        """
        for i, rule in enumerate(self._rules):
            if rule.name == name:
                self._rules.pop(i)
                return True
        return False

    def get_rules(self) -> List[ValidationRule]:
        """
        등록된 규칙 조회

        Returns:
            규칙 리스트
        """
        return self._rules.copy()

    def clear_rules(self) -> None:
        """모든 규칙 제거"""
        self._rules.clear()

    def validate(self, result: Dict[str, Any]) -> ValidationResult:
        """
        결과 검증 실행

        Args:
            result: 검증할 결과 데이터

        Returns:
            검증 결과
        """
        all_errors = []
        all_valid = True

        for rule in self._rules:
            try:
                validation_result = rule.func(result)
                if not validation_result.valid:
                    all_valid = False
                    if validation_result.errors:
                        all_errors.extend(validation_result.errors)
                    if validation_result.reason:
                        all_errors.append(validation_result.reason)
            except Exception as e:
                all_valid = False
                all_errors.append(f"규칙 '{rule.name}' 실행 중 오류: {str(e)}")

        return ValidationResult(
            valid=all_valid,
            errors=all_errors,
            reason="; ".join(all_errors) if all_errors else None,
        )

    def validate_many(self, results: List[Dict[str, Any]]) -> List[ValidationResult]:
        """
        다중 결과 검증

        Args:
            results: 검증할 결과 데이터 리스트

        Returns:
            검증 결과 리스트
        """
        return [self.validate(result) for result in results]

    # 정적 팩토리 메서드 - 검증 규칙 생성

    @staticmethod
    def required_fields(fields: List[str]) -> ValidationRule:
        """
        필수 필드 규칙 생성

        Args:
            fields: 필수 필드 이름 리스트

        Returns:
            검증 규칙
        """
        def check(data: Dict[str, Any]) -> ValidationResult:
            missing = [f for f in fields if f not in data or data[f] is None]
            if missing:
                return ValidationResult(
                    valid=False,
                    reason=f"필수 필드 누락: {', '.join(missing)}",
                )
            return ValidationResult(valid=True)

        return ValidationRule(
            name="required_fields",
            func=check,
            description=f"필수 필드: {', '.join(fields)}",
        )

    @staticmethod
    def file_type(allowed_types: List[str]) -> ValidationRule:
        """
        파일 타입 규칙 생성

        Args:
            allowed_types: 허용된 MIME 타입 또는 확장자

        Returns:
            검증 규칙
        """
        def check(data: Dict[str, Any]) -> ValidationResult:
            file_path = data.get("file_path") or data.get("filePath")
            if not file_path:
                return ValidationResult(valid=True)  # 파일이 없으면 통과

            # 확장자 확인
            ext = os.path.splitext(file_path)[1].lower()
            if ext in allowed_types:
                return ValidationResult(valid=True)

            # MIME 타입 확인
            mime_type, _ = mimetypes.guess_type(file_path)
            if mime_type in allowed_types:
                return ValidationResult(valid=True)

            return ValidationResult(
                valid=False,
                reason=f"허용되지 않는 파일 타입: {ext}",
            )

        return ValidationRule(
            name="file_type",
            func=check,
            description=f"허용 파일 타입: {', '.join(allowed_types)}",
        )

    @staticmethod
    def file_size(max_bytes: int) -> ValidationRule:
        """
        파일 크기 규칙 생성

        Args:
            max_bytes: 최대 파일 크기 (바이트)

        Returns:
            검증 규칙
        """
        def check(data: Dict[str, Any]) -> ValidationResult:
            file_path = data.get("file_path") or data.get("filePath")
            file_size = data.get("file_size") or data.get("fileSize")

            if file_path and os.path.exists(file_path):
                file_size = os.path.getsize(file_path)

            if file_size is None:
                return ValidationResult(valid=True)

            if file_size > max_bytes:
                mb_size = max_bytes / (1024 * 1024)
                return ValidationResult(
                    valid=False,
                    reason=f"파일 크기 초과: {file_size} > {mb_size:.1f}MB",
                )

            return ValidationResult(valid=True)

        return ValidationRule(
            name="file_size",
            func=check,
            description=f"최대 파일 크기: {max_bytes} bytes",
        )

    @staticmethod
    def score_threshold(min_score: float, max_score: float = 100) -> ValidationRule:
        """
        점수 임계값 규칙 생성

        Args:
            min_score: 최소 점수
            max_score: 최대 점수

        Returns:
            검증 규칙
        """
        def check(data: Dict[str, Any]) -> ValidationResult:
            score = data.get("score") or data.get("verificationScore", 0)

            if not isinstance(score, (int, float)):
                return ValidationResult(
                    valid=False,
                    reason=f"점수가 숫자가 아닙니다: {type(score)}",
                )

            if score < min_score or score > max_score:
                return ValidationResult(
                    valid=False,
                    reason=f"점수가 범위를 벗어났습니다: {score} not in [{min_score}, {max_score}]",
                )

            return ValidationResult(valid=True)

        return ValidationRule(
            name="score_threshold",
            func=check,
            description=f"점수 범위: {min_score} ~ {max_score}",
        )

    @staticmethod
    def freshness(max_age_ms: int) -> ValidationRule:
        """
        신선도 규칙 생성 (시간 기반)

        Args:
            max_age_ms: 최대 허용 시간 (밀리초)

        Returns:
            검증 규칙
        """
        max_age = timedelta(milliseconds=max_age_ms)

        def check(data: Dict[str, Any]) -> ValidationResult:
            created_at = data.get("created_at") or data.get("createdAt")
            updated_at = data.get("updated_at") or data.get("updatedAt")

            timestamp_str = updated_at or created_at
            if not timestamp_str:
                return ValidationResult(valid=True)

            try:
                # ISO 8601 파싱
                if isinstance(timestamp_str, str):
                    timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                else:
                    timestamp = timestamp_str

                age = datetime.utcnow() - timestamp
                if age > max_age:
                    return ValidationResult(
                        valid=False,
                        reason=f"데이터가 너무 오래되었습니다: {age}",
                    )

            except (ValueError, TypeError) as e:
                return ValidationResult(
                    valid=False,
                    reason=f"타임스탬프 파싱 오류: {e}",
                )

            return ValidationResult(valid=True)

        return ValidationRule(
            name="freshness",
            func=check,
            description=f"최대 허용 시간: {max_age}",
        )

    @staticmethod
    def schema(schema_def: Dict[str, Any]) -> ValidationRule:
        """
        스키마 규칙 생성

        Args:
            schema_def: 스키마 정의

        Returns:
            검증 규칙
        """
        def check(data: Dict[str, Any]) -> ValidationResult:
            errors = []

            for key, spec in schema_def.items():
                if spec.get("required", False) and key not in data:
                    errors.append(f"필수 필드 누락: {key}")
                    continue

                if key in data:
                    value = data[key]
                    expected_type = spec.get("type")

                    if expected_type == "string" and not isinstance(value, str):
                        errors.append(f"{key}: 문자열이어야 함")
                    elif expected_type == "number" and not isinstance(value, (int, float)):
                        errors.append(f"{key}: 숫자여야 함")
                    elif expected_type == "boolean" and not isinstance(value, bool):
                        errors.append(f"{key}: 불리언이어야 함")
                    elif expected_type == "array" and not isinstance(value, list):
                        errors.append(f"{key}: 배열이어야 함")

                    # 최소/최대 길이 확인
                    if isinstance(value, (str, list)):
                        min_length = spec.get("minLength")
                        max_length = spec.get("maxLength")

                        if min_length and len(value) < min_length:
                            errors.append(f"{key}: 길이가 {min_length} 미만")
                        if max_length and len(value) > max_length:
                            errors.append(f"{key}: 길이가 {max_length} 초과")

            return ValidationResult(
                valid=len(errors) == 0,
                errors=errors,
                reason="; ".join(errors) if errors else None,
            )

        return ValidationRule(
            name="schema",
            func=check,
            description="스키마 검증",
        )

    @staticmethod
    def regex(pattern: str, field: str = "content") -> ValidationRule:
        """
        정규식 규칙 생성

        Args:
            pattern: 정규식 패턴
            field: 검증할 필드 이름

        Returns:
            검증 귄칙
        """
        compiled_pattern = re.compile(pattern)

        def check(data: Dict[str, Any]) -> ValidationResult:
            value = data.get(field)

            if value is None:
                return ValidationResult(valid=True)

            if not isinstance(value, str):
                return ValidationResult(
                    valid=False,
                    reason=f"{field}: 문자열이어야 함",
                )

            if not compiled_pattern.search(value):
                return ValidationResult(
                    valid=False,
                    reason=f"{field}: 패턴 불일치",
                )

            return ValidationResult(valid=True)

        return ValidationRule(
            name="regex",
            func=check,
            description=f"정규식: {pattern}",
        )
