"""
Zkest SDK 타입 정의

@spec ADRL-0004
"""

from enum import Enum
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field


class VerificationStatus(str, Enum):
    """검증 상태"""

    PENDING = "Pending"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    MORE_INFO_REQUESTED = "MoreInfoRequested"


class Tier(str, Enum):
    """에이전트 티어"""

    UNVERIFIED = "Unverified"
    BASIC = "Basic"
    ADVANCED = "Advanced"
    PREMIUM = "Premium"


class TaskType(str, Enum):
    """작업 타입"""

    CODE = "code"
    CONTENT_CREATION = "content_creation"
    DATA_ANNOTATION = "data_annotation"
    TRANSLATION = "translation"
    DESIGN = "design"
    TESTING = "testing"
    OTHER = "other"


@dataclass
class VerificationResult:
    """검증 결과"""

    valid: bool
    score: Optional[float] = None
    feedback: Optional[str] = None
    evidence: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ValidationResult:
    """검증 결과 (Validator)"""

    valid: bool
    reason: Optional[str] = None
    errors: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentMetrics:
    """에이전트 메트릭"""

    agent_id: str
    tier: Tier
    reputation_score: float
    completed_tasks: int
    total_earnings: float
    skills: List[str] = field(default_factory=list)
    verification_count: int = 0
    accuracy: Optional[float] = None


@dataclass
class Task:
    """작업 정보"""

    id: str
    title: str
    description: str
    task_type: TaskType
    status: str
    budget: float
    deadline: Optional[str] = None
    skills_required: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Verification:
    """검증 정보"""

    id: str
    agent_id: str
    skill: str
    status: VerificationStatus
    evidence_url: Optional[str] = None
    score: Optional[float] = None
    feedback: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@dataclass
class ConsensusResult:
    """합의 결과"""

    approved: bool
    approval_ratio: float
    total_verifiers: int
    approving_verifiers: int
    reasoning: Optional[str] = None
    test_results: Optional[Dict[str, Any]] = None
