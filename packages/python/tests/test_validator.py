"""
ResultValidator 테스트

@spec ADRL-0004
"""

import pytest
from zkest_sdk.validator import ResultValidator, ValidationRule
from zkest_sdk.types import ValidationResult


class TestResultValidator:
    """ResultValidator 테스트"""

    def test_empty_validator(self):
        """빈 검증기"""
        validator = ResultValidator()
        result = validator.validate({})
        assert result.valid is True

    def test_required_fields_pass(self):
        """필수 필드 검증 - 통과"""
        validator = ResultValidator()
        validator.add_validation_rule(
            ResultValidator.required_fields(["title", "description"])
        )
        result = validator.validate({"title": "Test", "description": "Test description"})
        assert result.valid is True

    def test_required_fields_fail(self):
        """필수 필드 검증 - 실패"""
        validator = ResultValidator()
        validator.add_validation_rule(
            ResultValidator.required_fields(["title", "description"])
        )
        result = validator.validate({"title": "Test"})
        assert result.valid is False
        assert "description" in result.reason

    def test_score_threshold_pass(self):
        """점수 임계값 검증 - 통과"""
        validator = ResultValidator()
        validator.add_validation_rule(
            ResultValidator.score_threshold(min_score=80)
        )
        result = validator.validate({"score": 85})
        assert result.valid is True

    def test_score_threshold_fail(self):
        """점수 임계값 검증 - 실패"""
        validator = ResultValidator()
        validator.add_validation_rule(
            ResultValidator.score_threshold(min_score=80)
        )
        result = validator.validate({"score": 75})
        assert result.valid is False

    def test_remove_rule(self):
        """규칙 제거"""
        validator = ResultValidator()
        validator.add_validation_rule(
            ResultValidator.required_fields(["title"])
        )
        assert len(validator.get_rules()) == 1

        removed = validator.remove_rule("required_fields")
        assert removed is True
        assert len(validator.get_rules()) == 0

    def test_clear_rules(self):
        """모든 규칙 제거"""
        validator = ResultValidator()
        validator.add_validation_rule(
            ResultValidator.required_fields(["title"])
        )
        validator.add_validation_rule(
            ResultValidator.score_threshold(min_score=80)
        )
        assert len(validator.get_rules()) == 2

        validator.clear_rules()
        assert len(validator.get_rules()) == 0

    def test_validate_many(self):
        """다중 검증"""
        validator = ResultValidator()
        validator.add_validation_rule(
            ResultValidator.required_fields(["title"])
        )

        results = validator.validate_many([
            {"title": "Test 1"},
            {"title": "Test 2"},
            {"description": "No title"},
        ])

        assert results[0].valid is True
        assert results[1].valid is True
        assert results[2].valid is False

    def test_schema_validation_pass(self):
        """스키마 검증 - 통과"""
        validator = ResultValidator()
        schema = {
            "title": {"type": "string", "required": True},
            "count": {"type": "number", "required": True},
        }
        validator.add_validation_rule(ResultValidator.schema(schema))

        result = validator.validate({"title": "Test", "count": 5})
        assert result.valid is True

    def test_schema_validation_fail(self):
        """스키마 검증 - 실패"""
        validator = ResultValidator()
        schema = {
            "title": {"type": "string", "required": True},
            "count": {"type": "number", "required": True},
        }
        validator.add_validation_rule(ResultValidator.schema(schema))

        result = validator.validate({"title": "Test"})
        assert result.valid is False
        assert "count" in str(result.errors)
