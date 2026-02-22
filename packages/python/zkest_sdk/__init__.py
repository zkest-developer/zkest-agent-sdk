"""
Zkest SDK - AgentDeal Platform Python SDK

이 패키지는 Zkest 플랫폼을 위한 Python SDK를 제공합니다.
에이전트 자격 검증, 작업 관리, 실시간 업데이트 등의 기능을 포함합니다.

@spec ADRL-0003, ADRL-0004, ADRL-XXXX (Agent Authentication)
"""

from zkest_sdk.client import ZkestClient, AsyncZkestClient
from zkest_sdk.agent import AutoVerifier, AutoApprover
from zkest_sdk.validator import ResultValidator
from zkest_sdk.websocket import VerificationStream
from zkest_sdk.auth import (
    EcdsaAuth,
    AgentCredentials,
    AgentKeyPair,
    generate_keypair,
    create_auth_from_private_key,
)
from zkest_sdk.types import (
    # Enums
    VerificationStatus,
    Tier,
    VerificationTier,
    TaskType,
    TaskStatus,
    BidStatus,
    PaymentType,
    PaymentStatus,
    DisputeStatus,
    DisputeResolution,
    AssignmentStatus,
    VerificationMethod,
    ReputationEventType,
    DeliverableType,
    VerificationResultType,
    # Data Classes
    VerificationResult,
    ValidationResult,
    AgentMetrics,
    Task,
    Verification,
    ConsensusResult,
    AgentStats,
    Agent,
    SelectionCriteria,
    CoreTask,
    Bid,
    CreateBidDto,
    TaskAssignment,
    Deliverable,
    CorePayment,
    CreatePaymentDto,
    CoreDispute,
    CreateDisputeDto,
    ResolveDisputeDto,
    ReputationEvent,
    ProofData,
    CoreVerification,
    # DTOs
    PaginationQuery,
    TaskFilterDto,
    BidFilterDto,
    PaymentFilterDto,
    DisputeFilterDto,
    # Agent Client Types
    AgentTier,
    AgentSkill,
    CreateAgentDto,
    UpdateAgentDto,
    AgentFilterDto,
    AddSkillDto,
    # Task Client Types
    CreateTaskDto,
    UpdateTaskDto,
)
from zkest_sdk.clients import BidClient, PaymentClient, DisputeClient, AgentClient, TaskClient
from zkest_sdk.clients.bid_client import BidClientOptions
from zkest_sdk.clients.payment_client import (
    PaymentClientOptions,
    PaymentStatistics,
    UpdatePaymentStatusDto,
)
from zkest_sdk.clients.dispute_client import (
    DisputeClientOptions,
    DisputeStatistics,
)
from zkest_sdk.clients.agent_client import AgentClientOptions
from zkest_sdk.clients.task_client import TaskClientOptions
from zkest_sdk.clients.matchmaking_client import (
    MatchmakingClient,
    MatchmakingClientOptions,
    SelectionMethod,
    MatchRequest,
    MatchResult,
    TaskRecommendation,
)
from zkest_sdk.exceptions import (
    ZkestError,
    AuthenticationError,
    ValidationError,
    APIError,
    WebSocketError,
)

__version__ = "0.3.0"
__author__ = "Zkest Team"
__license__ = "MIT"

__all__ = [
    # Version
    "__version__",
    # Clients
    "ZkestClient",
    "AsyncZkestClient",
    "BidClient",
    "PaymentClient",
    "DisputeClient",
    "AgentClient",
    "TaskClient",
    "MatchmakingClient",
    "BidClientOptions",
    "PaymentClientOptions",
    "PaymentStatistics",
    "UpdatePaymentStatusDto",
    "DisputeClientOptions",
    "DisputeStatistics",
    "AgentClientOptions",
    "TaskClientOptions",
    "MatchmakingClientOptions",
    "SelectionMethod",
    "MatchRequest",
    "MatchResult",
    "TaskRecommendation",
    # Agents
    "AutoVerifier",
    "AutoApprover",
    # Validator
    "ResultValidator",
    # WebSocket
    "VerificationStream",
    # Auth
    "EcdsaAuth",
    "AgentCredentials",
    "AgentKeyPair",
    "generate_keypair",
    "create_auth_from_private_key",
    # Types - Enums
    "VerificationStatus",
    "Tier",
    "VerificationTier",
    "TaskType",
    "TaskStatus",
    "BidStatus",
    "PaymentType",
    "PaymentStatus",
    "DisputeStatus",
    "DisputeResolution",
    "AssignmentStatus",
    "VerificationMethod",
    "ReputationEventType",
    "DeliverableType",
    "VerificationResultType",
    # Types - Data Classes
    "VerificationResult",
    "ValidationResult",
    "AgentMetrics",
    "Task",
    "Verification",
    "ConsensusResult",
    "AgentStats",
    "Agent",
    "SelectionCriteria",
    "CoreTask",
    "Bid",
    "CreateBidDto",
    "TaskAssignment",
    "Deliverable",
    "CorePayment",
    "CreatePaymentDto",
    "CoreDispute",
    "CreateDisputeDto",
    "ResolveDisputeDto",
    "ReputationEvent",
    "ProofData",
    "CoreVerification",
    # Types - DTOs
    "PaginationQuery",
    "TaskFilterDto",
    "BidFilterDto",
    "PaymentFilterDto",
    "DisputeFilterDto",
    # Agent Client Types
    "AgentTier",
    "AgentSkill",
    "CreateAgentDto",
    "UpdateAgentDto",
    "AgentFilterDto",
    "AddSkillDto",
    # Task Client Types
    "CreateTaskDto",
    "UpdateTaskDto",
    # Exceptions
    "ZkestError",
    "AuthenticationError",
    "ValidationError",
    "APIError",
    "WebSocketError",
]
