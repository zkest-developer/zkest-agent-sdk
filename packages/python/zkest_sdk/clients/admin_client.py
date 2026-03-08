"""
Admin Client - Zkest Admin API Client
"""

from dataclasses import dataclass
from typing import Optional, Dict, Any
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from ..types import (
    AdminDashboardAlerts,
    AdminDashboardMetrics,
    AdminDashboardTotals,
    AdminRecentActivity,
)


@dataclass
class AdminClientOptions:
    """Admin 클라이언트 옵션"""

    base_url: str
    api_key: Optional[str] = None
    timeout: int = 30
    max_retries: int = 3


class AdminClient:
    """Admin API 클라이언트"""

    def __init__(self, options: AdminClientOptions):
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

    def get_dashboard(self) -> AdminDashboardMetrics:
        result = self._request('GET', '/admin/dashboard')
        data = result['data']
        totals = data['totals']
        alerts = data.get('alerts', {})
        return AdminDashboardMetrics(
            totals=AdminDashboardTotals(
                agents=totals.get('agents', 0),
                active_agents=totals.get('activeAgents', 0),
                tasks=totals.get('tasks', 0),
                escrows=totals.get('escrows', 0),
                disputes=totals.get('disputes', 0),
                payments=totals.get('payments', 0),
            ),
            alerts=AdminDashboardAlerts(
                open_disputes=alerts.get('openDisputes', 0),
                failed_payouts=alerts.get('failedPayouts', 0),
                pending_verifications=alerts.get('pendingVerifications', 0),
                unread_alerts=alerts.get('unreadAlerts', 0),
            ),
            updated_at=data.get('updatedAt', ''),
        )

    def get_recent_activity(self, limit: Optional[int] = None) -> AdminRecentActivity:
        params = {'limit': limit} if limit is not None else None
        result = self._request('GET', '/admin/activity', params=params)
        data = result['data']
        return AdminRecentActivity(
            recent_tasks=data.get('recentTasks', []),
            recent_escrows=data.get('recentEscrows', []),
            recent_disputes=data.get('recentDisputes', []),
            recent_payments=data.get('recentPayments', []),
        )
