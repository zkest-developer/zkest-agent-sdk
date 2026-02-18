"""
API 클라이언트 테스트

@spec ADRL-0004
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from zkest_sdk.client import ZkestClient
from zkest_sdk.exceptions import APIError, AuthenticationError


class TestZkestClient:
    """ZkestClient 테스트"""

    @pytest.fixture
    def client(self):
        """클라이언트 픽스처"""
        return ZkestClient(
            api_url="https://api.zkest.io",
            api_key="test-key",
        )

    @pytest.fixture
    def mock_session(self):
        """세션 모의"""
        with patch('zkest_sdk.client.requests.Session') as mock:
            session = MagicMock()
            mock.return_value = session
            yield session

    def test_init(self, client):
        """초기화 테스트"""
        assert client.api_url == "https://api.zkest.io"
        assert client.api_key == "test-key"
        assert client.timeout == 30

    def test_get_headers(self, client):
        """헤더 생성 테스트"""
        headers = client._get_headers()
        assert headers["Content-Type"] == "application/json"
        assert headers["Authorization"] == "Bearer test-key"

    def test_handle_response_success(self, client):
        """성공 응답 처리"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"success": True}

        result = client._handle_response(mock_response)
        assert result == {"success": True}

    def test_handle_response_401(self, client):
        """401 응답 처리"""
        mock_response = MagicMock()
        mock_response.status_code = 401

        with pytest.raises(AuthenticationError):
            client._handle_response(mock_response)

    def test_handle_response_404(self, client):
        """404 응답 처리"""
        mock_response = MagicMock()
        mock_response.status_code = 404

        with pytest.raises(APIError):
            client._handle_response(mock_response)

    def test_handle_response_500(self, client):
        """500 응답 처리"""
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.json.return_value = {"message": "Server error"}

        with pytest.raises(APIError):
            client._handle_response(mock_response)

    def test_context_manager(self):
        """컨텍스트 매니저 테스트"""
        with ZkestClient(api_url="https://api.test.com") as client:
            assert client is not None
        # 컨텍스트 종료 후 세션이 닫혀야 함
