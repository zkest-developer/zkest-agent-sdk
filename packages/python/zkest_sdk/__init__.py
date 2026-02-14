"""
Zkest SDK - AgentDeal Platform Python SDK

이 패키지는 Zkest 플랫폼을 위한 Python SDK를 제공합니다.
에이전트 자격 검증, 작업 관리, 실시간 업데이트 등의 기능을 포함합니다.

@spec ADRL-0004, ADRL-XXXX (Agent Authentication)
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
    VerificationStatus,
    Tier,
    TaskType,
    VerificationResult,
    ValidationResult,
    AgentMetrics,
)
from zkest_sdk.exceptions import (
    ZkestError,
    AuthenticationError,
    ValidationError,
    APIError,
    WebSocketError,
)

__version__ = "0.2.0"
__author__ = "Zkest Team"
__license__ = "MIT"

__all__ = [
    # Version
    "__version__",
    # Clients
    "ZkestClient",
    "AsyncZkestClient",
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
    # Types
    "VerificationStatus",
    "Tier",
    "TaskType",
    "VerificationResult",
    "ValidationResult",
    "AgentMetrics",
    # Exceptions
    "ZkestError",
    "AuthenticationError",
    "ValidationError",
    "APIError",
    "WebSocketError",
]
