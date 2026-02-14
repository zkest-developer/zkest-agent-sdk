"""
타입 정의 테스트

@spec ADRL-0004
"""

import pytest
from zkest_sdk.types import (
    VerificationStatus,
    Tier,
    TaskType,
    VerificationResult,
    ValidationResult,
    AgentMetrics,
    Task,
    Verification,
    ConsensusResult,
)


class TestVerificationStatus:
    """VerificationStatus 테스트"""

    def test_enum_values(self):
        """열거형 값 확인"""
        assert VerificationStatus.PENDING.value == "Pending"
        assert VerificationStatus.APPROVED.value == "Approved"
        assert VerificationStatus.REJECTED.value == "Rejected"
        assert VerificationStatus.MORE_INFO_REQUESTED.value == "MoreInfoRequested"


class TestTier:
    """Tier 테스트"""

    def test_enum_values(self):
        """열거형 값 확인"""
        assert Tier.UNVERIFIED.value == "Unverified"
        assert Tier.BASIC.value == "Basic"
        assert Tier.ADVANCED.value == "Advanced"
        assert Tier.PREMIUM.value == "Premium"


class TestTaskType:
    """TaskType 테스트"""

    def test_enum_values(self):
        """열거형 값 확인"""
        assert TaskType.CODE.value == "code"
        assert TaskType.CONTENT_CREATION.value == "content_creation"
        assert TaskType.DATA_ANNOTATION.value == "data_annotation"
        assert TaskType.TRANSLATION.value == "translation"
        assert TaskType.DESIGN.value == "design"
        assert TaskType.TESTING.value == "testing"
        assert TaskType.OTHER.value == "other"


class TestVerificationResult:
    """VerificationResult 테스트"""

    def test_creation(self):
        """기본 생성"""
        result = VerificationResult(valid=True)
        assert result.valid is True
        assert result.score is None
        assert result.feedback is None

    def test_creation_with_values(self):
        """값 포함 생성"""
        result = VerificationResult(
            valid=True,
            score=95,
            feedback="Excellent",
            evidence="url",
            metadata={"key": "value"},
        )
        assert result.valid is True
        assert result.score == 95
        assert result.feedback == "Excellent"
        assert result.evidence == "url"
        assert result.metadata == {"key": "value"}


class TestValidationResult:
    """ValidationResult 테스트"""

    def test_creation(self):
        """기본 생성"""
        result = ValidationResult(valid=True)
        assert result.valid is True
        assert result.reason is None
        assert result.errors == []

    def test_creation_with_errors(self):
        """에러 포함 생성"""
        result = ValidationResult(
            valid=False,
            reason="Invalid",
            errors=["Error 1", "Error 2"],
        )
        assert result.valid is False
        assert result.reason == "Invalid"
        assert result.errors == ["Error 1", "Error 2"]


class TestAgentMetrics:
    """AgentMetrics 테스트"""

    def test_creation(self):
        """기본 생성"""
        metrics = AgentMetrics(
            agent_id="agent-001",
            tier=Tier.BASIC,
            reputation_score=85.5,
            completed_tasks=10,
            total_earnings=100.0,
        )
        assert metrics.agent_id == "agent-001"
        assert metrics.tier == Tier.BASIC
        assert metrics.reputation_score == 85.5
        assert metrics.completed_tasks == 10
        assert metrics.total_earnings == 100.0
        assert metrics.skills == []
        assert metrics.verification_count == 0


class TestConsensusResult:
    """ConsensusResult 테스트"""

    def test_creation(self):
        """기본 생성"""
        result = ConsensusResult(
            approved=True,
            approval_ratio=80.0,
            total_verifiers=5,
            approving_verifiers=4,
        )
        assert result.approved is True
        assert result.approval_ratio == 80.0
        assert result.total_verifiers == 5
        assert result.approving_verifiers == 4
