"""
Zkest SDK 타입 정의

@spec ADRL-0003, ADRL-0004, ADRL-0005
"""

from enum import Enum
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from datetime import datetime


# ============================================================
# Enums
# ============================================================


class VerificationStatus(str, Enum):
    """검증 상태"""

    PENDING = "Pending"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    MORE_INFO_REQUESTED = "MoreInfoRequested"


class Tier(str, Enum):
    """에이전트 티어 (Legacy - VerificationTier 사용 권장)"""

    UNVERIFIED = "Unverified"
    BASIC = "Basic"
    ADVANCED = "Advanced"
    PREMIUM = "Premium"


class VerificationTier(str, Enum):
    """검증 티어
    @spec ADRL-0003
    """

    TIER_1 = "tier_1"  # Easy: API calls, data retrieval
    TIER_2 = "tier_2"  # Medium: Data analysis, code generation
    TIER_3 = "tier_3"  # Hard: Strategic decisions, negotiations
    TIER_4 = "tier_4"  # Very Hard: Autonomous trading, security audits


class TaskType(str, Enum):
    """작업 타입"""

    CODE = "code"
    CONTENT_CREATION = "content_creation"
    DATA_ANNOTATION = "data_annotation"
    TRANSLATION = "translation"
    DESIGN = "design"
    TESTING = "testing"
    OTHER = "other"


class TaskStatus(str, Enum):
    """작업 상태
    @spec ADRL-0003
    """

    POSTED = "posted"
    BIDDING = "bidding"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    VERIFICATION = "verification"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"


class BidStatus(str, Enum):
    """입찰 상태
    @spec ADRL-0003
    """

    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class PaymentType(str, Enum):
    """결제 타입
    @spec ADRL-0003
    """

    ESCROW_DEPOSIT = "escrow_deposit"
    PAYMENT = "payment"
    REFUND = "refund"
    FEE = "fee"
    DISPUTE_PAYOUT = "dispute_payout"


class PaymentStatus(str, Enum):
    """결제 상태
    @spec ADRL-0003
    """

    PENDING = "pending"
    PROCESSING = "processing"
    CONFIRMED = "confirmed"
    FAILED = "failed"


class DisputeStatus(str, Enum):
    """분쟁 상태
    @spec ADRL-0003
    """

    OPEN = "open"
    REVIEWING = "reviewing"
    RESOLVED = "resolved"
    ESCALATED = "escalated"


class DisputeResolution(str, Enum):
    """분쟁 해결 방식
    @spec ADRL-0003
    """

    FULL_REFUND = "full_refund"
    PARTIAL_REFUND = "partial_refund"
    FULL_PAYMENT = "full_payment"
    PARTIAL_PAYMENT = "partial_payment"
    SPLIT = "split"


class NotificationType(str, Enum):
    """알림 타입"""

    TASK = "task"
    DISPUTE = "dispute"
    PAYMENT = "payment"
    SYSTEM = "system"


class LedgerReferenceType(str, Enum):
    """원장 참조 타입"""

    ESCROW = "escrow"
    PAYMENT = "payment"
    DISPUTE = "dispute"
    FEE = "fee"
    ADJUSTMENT = "adjustment"


class LedgerDirection(str, Enum):
    """원장 방향"""

    DEBIT = "debit"
    CREDIT = "credit"


class LedgerStatus(str, Enum):
    """원장 상태"""

    PENDING = "pending"
    POSTED = "posted"
    FAILED = "failed"


class AssignmentStatus(str, Enum):
    """할당 상태
    @spec ADRL-0003
    """

    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    VERIFIED = "verified"
    PAID = "paid"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"


class VerificationMethod(str, Enum):
    """검증 방식
    @spec ADRL-0003
    """

    AUTOMATED = "automated"
    ZK_PROOF = "zk_proof"
    AI_JUDGE = "ai_judge"
    PEER_REVIEW = "peer_review"
    TEE = "tee"
    HUMAN = "human"


class ReputationEventType(str, Enum):
    """평판 이벤트 타입
    @spec ADRL-0003
    """

    TASK_COMPLETED = "task_completed"
    TASK_FAILED = "task_failed"
    VERIFICATION_PASSED = "verification_passed"
    VERIFICATION_FAILED = "verification_failed"
    DISPUTE_WON = "dispute_won"
    DISPUTE_LOST = "dispute_lost"
    EARLY_DELIVERY = "early_delivery"
    LATE_DELIVERY = "late_delivery"
    STAKE_INCREASED = "stake_increased"
    STAKE_DECREASED = "stake_decreased"


class DeliverableType(str, Enum):
    """산출물 타입
    @spec ADRL-0003
    """

    TEXT = "text"
    CODE = "code"
    DATA = "data"
    DOCUMENT = "document"
    IMAGE = "image"
    MODEL = "model"
    PROOF = "proof"
    OTHER = "other"


class VerificationResultType(str, Enum):
    """검증 결과 타입"""

    PENDING = "pending"
    PASSED = "passed"
    FAILED = "failed"
    PARTIAL = "partial"


# ============================================================
# Data Classes
# ============================================================


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


# ============================================================
# ADRL-0003: Core Domain Types
# ============================================================


@dataclass
class AgentStats:
    """에이전트 통계
    @spec ADRL-0003
    """

    completion_rate: float = 0.0
    verification_pass_rate: float = 0.0
    average_quality_score: float = 0.0
    dispute_win_rate: float = 0.0
    timeliness_rate: float = 0.0
    responsiveness_score: float = 0.0
    staking_consistency: float = 0.0


@dataclass
class Agent:
    """에이전트 정보
    @spec ADRL-0003
    """

    id: str
    wallet_address: str
    capabilities: List[str] = field(default_factory=list)
    verification_tiers: List[VerificationTier] = field(default_factory=list)
    reputation_score: float = 0.0
    total_tasks_completed: int = 0
    total_earnings: str = "0"
    staking_amount: str = "0"
    is_active: bool = True
    display_name: Optional[str] = None
    description: Optional[str] = None
    stats: Optional[AgentStats] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class SelectionCriteria:
    """선택 기준
    @spec ADRL-0003
    """

    method: str  # 'lowest_price' | 'reputation_weighted' | 'custom_score'
    weights: Optional[Dict[str, float]] = None
    min_reputation: Optional[float] = None
    max_delivery_time: Optional[int] = None


@dataclass
class CoreTask:
    """작업 정보 (Core)
    @spec ADRL-0003
    """

    id: str
    requester_id: str
    title: str
    description: str
    budget: str
    token_address: str
    verification_tier: str
    status: TaskStatus
    requirements: Dict[str, Any] = field(default_factory=dict)
    acceptance_criteria: Dict[str, Any] = field(default_factory=dict)
    selection_criteria: Optional[SelectionCriteria] = None
    deadline: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class Bid:
    """입찰 정보
    @spec ADRL-0003
    """

    id: str
    task_id: str
    agent_id: str
    price: str
    estimated_duration_hours: int
    status: BidStatus
    proposal: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class CreateBidDto:
    """입찰 생성 DTO
    @spec ADRL-0003
    """

    task_id: str
    agent_id: str
    price: str
    estimated_duration_hours: int
    proposal: Optional[str] = None


@dataclass
class TaskAssignment:
    """작업 할당 정보
    @spec ADRL-0003
    """

    id: str
    task_id: str
    agent_id: str
    bid_id: str
    status: AssignmentStatus
    escrow_tx_hash: Optional[str] = None
    started_at: Optional[datetime] = None
    deadline: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class Deliverable:
    """산출물 정보
    @spec ADRL-0003
    """

    id: str
    assignment_id: str
    type: DeliverableType
    submitted_at: datetime
    content: Optional[str] = None
    ipfs_hash: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CorePayment:
    """결제 정보 (Core)
    @spec ADRL-0003
    """

    id: str
    assignment_id: str
    from_address: str
    to_address: str
    amount: str
    token_address: str
    type: PaymentType
    status: PaymentStatus
    tx_hash: Optional[str] = None
    fee_amount: Optional[str] = None
    created_at: Optional[datetime] = None
    confirmed_at: Optional[datetime] = None


@dataclass
class CreatePaymentDto:
    """결제 생성 DTO
    @spec ADRL-0003
    """

    assignment_id: str
    from_address: str
    to_address: str
    amount: str
    token_address: str
    type: PaymentType


@dataclass
class CoreDispute:
    """분쟁 정보 (Core)
    @spec ADRL-0003
    """

    id: str
    assignment_id: str
    initiator_id: str
    reason: str
    status: DisputeStatus
    evidence: Dict[str, Any] = field(default_factory=dict)
    resolution: Optional[DisputeResolution] = None
    arbitrator_id: Optional[str] = None
    stake_amount: str = "0"
    created_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None


@dataclass
class CreateDisputeDto:
    """분쟁 생성 DTO
    @spec ADRL-0003
    """

    assignment_id: str
    reason: str
    evidence: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ResolveDisputeDto:
    """분쟁 해결 DTO
    @spec ADRL-0003
    """

    resolution: DisputeResolution
    arbitrator_id: Optional[str] = None


@dataclass
class CoreNotification:
    """알림 정보 (Core)"""

    id: str
    recipient_wallet: str
    type: NotificationType
    title: str
    message: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    is_read: bool = False
    read_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class CreateNotificationDto:
    """알림 생성 DTO"""

    recipient_wallet: str
    type: NotificationType
    title: str
    message: str
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class NotificationBatchUpdateResult:
    """알림 일괄 업데이트 결과"""

    updated: int


@dataclass
class CoreLedgerEntry:
    """원장 엔트리 (Core)"""

    id: str
    reference_type: LedgerReferenceType
    reference_id: str
    token_address: str
    amount: str
    direction: LedgerDirection
    status: LedgerStatus
    from_address: Optional[str] = None
    to_address: Optional[str] = None
    batch_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    processed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class CreateLedgerEntryDto:
    """원장 엔트리 생성 DTO"""

    reference_type: LedgerReferenceType
    reference_id: str
    token_address: str
    amount: str
    direction: LedgerDirection
    from_address: Optional[str] = None
    to_address: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class LedgerBatchResult:
    """원장 배치 처리 결과"""

    batch_id: str
    processed_count: int


@dataclass
class LedgerSummary:
    """원장 요약"""

    total_entries: int
    by_status: Dict[str, int] = field(default_factory=dict)
    posted_volume: str = "0"


@dataclass
class AdminDashboardTotals:
    """어드민 대시보드 집계"""

    agents: int
    active_agents: int
    tasks: int
    escrows: int
    disputes: int
    payments: int


@dataclass
class AdminDashboardMetrics:
    """어드민 대시보드 메트릭"""

    totals: AdminDashboardTotals
    updated_at: str


@dataclass
class AdminRecentActivity:
    """어드민 최근 활동"""

    recent_tasks: List[Dict[str, Any]] = field(default_factory=list)
    recent_escrows: List[Dict[str, Any]] = field(default_factory=list)
    recent_disputes: List[Dict[str, Any]] = field(default_factory=list)
    recent_payments: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class ReputationEvent:
    """평판 이벤트
    @spec ADRL-0003
    """

    id: str
    agent_id: str
    task_id: str
    event_type: ReputationEventType
    score_change: float
    new_score: float
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: Optional[datetime] = None


@dataclass
class ProofData:
    """증명 데이터
    @spec ADRL-0003
    """

    proof: str
    public_inputs: List[str]
    verification_key: str
    circuit_type: str  # 'snark' | 'stark'


@dataclass
class CoreVerification:
    """검증 정보 (Core)
    @spec ADRL-0003
    """

    id: str
    assignment_id: str
    method: VerificationMethod
    result: VerificationResultType
    score: Optional[float] = None
    proof_data: Optional[ProofData] = None
    verified_by: Optional[str] = None
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


# ============================================================
# DTOs for API Requests
# ============================================================


@dataclass
class PaginationQuery:
    """페이지네이션 쿼리"""

    page: int = 1
    limit: int = 20
    offset: int = 0


@dataclass
class TaskFilterDto(PaginationQuery):
    """작업 필터 DTO"""

    status: Optional[TaskStatus] = None
    requester_id: Optional[str] = None
    agent_id: Optional[str] = None
    verification_tier: Optional[VerificationTier] = None


@dataclass
class BidFilterDto(PaginationQuery):
    """입찰 필터 DTO"""

    task_id: Optional[str] = None
    agent_id: Optional[str] = None
    status: Optional[BidStatus] = None


@dataclass
class PaymentFilterDto(PaginationQuery):
    """결제 필터 DTO"""

    assignment_id: Optional[str] = None
    status: Optional[PaymentStatus] = None
    type: Optional[PaymentType] = None
    from_address: Optional[str] = None
    to_address: Optional[str] = None


@dataclass
class DisputeFilterDto(PaginationQuery):
    """분쟁 필터 DTO"""

    assignment_id: Optional[str] = None
    initiator_id: Optional[str] = None
    arbitrator_id: Optional[str] = None
    status: Optional[DisputeStatus] = None


@dataclass
class NotificationFilterDto(PaginationQuery):
    """알림 필터 DTO"""

    recipient_wallet: Optional[str] = None
    type: Optional[NotificationType] = None
    is_read: Optional[bool] = None


@dataclass
class LedgerFilterDto(PaginationQuery):
    """원장 필터 DTO"""

    status: Optional[LedgerStatus] = None
    reference_type: Optional[LedgerReferenceType] = None
    batch_id: Optional[str] = None


# ============================================================
# Agent Client Types
# ============================================================

AgentTier = Tier  # Type alias for backward compatibility


@dataclass
class AgentSkill:
    """에이전트 스킬"""

    id: str
    agent_id: str
    category: str
    verification_status: VerificationStatus
    evidence_url: Optional[str] = None
    rejection_reason: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    reviewer_id: Optional[str] = None
    created_at: Optional[datetime] = None


@dataclass
class CreateAgentDto:
    """에이전트 생성 DTO"""

    public_key: str
    name: str
    description: Optional[str] = None
    skills: Optional[List[Dict[str, Any]]] = None


@dataclass
class UpdateAgentDto:
    """에이전트 수정 DTO"""

    name: Optional[str] = None
    description: Optional[str] = None


@dataclass
class AgentFilterDto(PaginationQuery):
    """에이전트 필터 DTO"""

    is_active: Optional[bool] = None
    min_reputation: Optional[float] = None
    tier: Optional[AgentTier] = None


@dataclass
class AddSkillDto:
    """스킬 추가 DTO"""

    category: str
    evidence_url: Optional[str] = None


# ============================================================
# Task Client Types
# ============================================================


@dataclass
class CreateTaskDto:
    """작업 생성 DTO"""

    title: str
    description: str
    budget: str
    requirements: Optional[Dict[str, Any]] = None
    token_address: Optional[str] = None
    deadline: Optional[datetime] = None
    verification_tier: Optional[VerificationTier] = None
    selection_criteria: Optional[SelectionCriteria] = None


@dataclass
class UpdateTaskDto:
    """작업 수정 DTO"""

    title: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[Dict[str, Any]] = None
    budget: Optional[str] = None
    deadline: Optional[datetime] = None
