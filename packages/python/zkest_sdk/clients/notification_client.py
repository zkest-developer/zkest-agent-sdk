"""
Notification Client - Zkest Notifications API Client
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Dict, Any, List
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from ..types import (
    CoreNotification,
    CreateNotificationDto,
    NotificationBatchUpdateResult,
    NotificationFilterDto,
    NotificationType,
)


@dataclass
class NotificationClientOptions:
    """Notification 클라이언트 옵션"""

    base_url: str
    api_key: Optional[str] = None
    timeout: int = 30
    max_retries: int = 3


class NotificationClient:
    """Notifications API 클라이언트"""

    def __init__(self, options: NotificationClientOptions):
        self.base_url = options.base_url.rstrip('/')
        self.timeout = options.timeout

        self.headers = {'Content-Type': 'application/json'}
        if options.api_key:
            self.headers['Authorization'] = f'Bearer {options.api_key}'

        self.session = requests.Session()
        retry_strategy = Retry(
            total=options.max_retries,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount('http://', adapter)
        self.session.mount('https://', adapter)

    def _request(
        self,
        method: str,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        json: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        url = f'{self.base_url}{path}'
        response = self.session.request(
            method,
            url,
            headers=self.headers,
            params=params,
            json=json,
            timeout=self.timeout,
        )
        response.raise_for_status()
        return response.json()

    def create(self, dto: CreateNotificationDto) -> CoreNotification:
        payload: Dict[str, Any] = {
            'recipientWallet': dto.recipient_wallet,
            'type': dto.type.value,
            'title': dto.title,
            'message': dto.message,
        }
        if dto.metadata:
            payload['metadata'] = dto.metadata

        result = self._request('POST', '/notifications', json=payload)
        return self._parse_notification(result['data'])

    def find_all(self, filter_dto: Optional[NotificationFilterDto] = None) -> List[CoreNotification]:
        params: Dict[str, Any] = {}
        if filter_dto:
            if filter_dto.recipient_wallet:
                params['recipientWallet'] = filter_dto.recipient_wallet
            if filter_dto.type:
                params['type'] = filter_dto.type.value
            if filter_dto.is_read is not None:
                params['isRead'] = filter_dto.is_read
            if filter_dto.limit:
                params['limit'] = filter_dto.limit
            if filter_dto.offset:
                params['offset'] = filter_dto.offset

        result = self._request('GET', '/notifications', params=params)
        return [self._parse_notification(item) for item in result.get('data', [])]

    def mark_as_read(self, notification_id: str) -> CoreNotification:
        result = self._request('PATCH', f'/notifications/{notification_id}/read')
        return self._parse_notification(result['data'])

    def mark_all_as_read(self) -> NotificationBatchUpdateResult:
        result = self._request('PATCH', '/notifications/read-all')
        return NotificationBatchUpdateResult(updated=result['data'].get('updated', 0))

    def get_unread_count(self) -> int:
        result = self._request('GET', '/notifications/unread-count')
        return int(result['data'].get('unreadCount', 0))

    def _parse_notification(self, data: Dict[str, Any]) -> CoreNotification:
        read_at = data.get('readAt')
        created_at = data.get('createdAt')
        updated_at = data.get('updatedAt')

        return CoreNotification(
            id=data['id'],
            recipient_wallet=data['recipientWallet'],
            type=NotificationType(data['type']),
            title=data['title'],
            message=data['message'],
            metadata=data.get('metadata') or {},
            is_read=bool(data.get('isRead', False)),
            read_at=datetime.fromisoformat(read_at.replace('Z', '+00:00')) if read_at else None,
            created_at=datetime.fromisoformat(created_at.replace('Z', '+00:00')) if created_at else None,
            updated_at=datetime.fromisoformat(updated_at.replace('Z', '+00:00')) if updated_at else None,
        )
