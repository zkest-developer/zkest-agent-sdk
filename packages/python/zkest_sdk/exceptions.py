"""
Zkest SDK 예외 클래스

@spec ADRL-0004
"""


class ZkestError(Exception):
    """Zkest SDK 기본 예외 클래스"""

    pass


class AuthenticationError(ZkestError):
    """인증 관련 오류"""

    pass


class ValidationError(ZkestError):
    """검증 관련 오류"""

    pass


class APIError(ZkestError):
    """API 호출 관련 오류"""

    def __init__(self, message: str, status_code: int = None, response_data: dict = None):
        self.status_code = status_code
        self.response_data = response_data
        super().__init__(message)


class WebSocketError(ZkestError):
    """WebSocket 연결 관련 오류"""

    pass


class ConfigurationError(ZkestError):
    """설정 관련 오류"""

    pass
