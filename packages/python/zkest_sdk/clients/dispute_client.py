"""
Dispute Client - Zkest Dispute Management API Client

@spec ADRL-0003
"""

from typing import List, Optional, Dict, Any
from dataclasses import dataclass
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from ..types import (
    CoreDispute,
    DisputeStatus,
    DisputeResolution,
    CreateDisputeDto,
    ResolveDisputeDto,
    DisputeFilterDto,
)


@dataclass
class DisputeClientOptions:
    """Dispute 클라이언트 옵션"""

    base_url: str
    api_key: Optional[str] = None
    timeout: int = 30
    max_retries: int = 3


@dataclass
class DisputeStatistics:
    """분쟁 통계"""

    total_disputes: int
    open_disputes: int
    resolved_disputes: int
    escalated_disputes: int
    average_resolution_time: float
    resolution_breakdown: Dict[DisputeResolution, int]


class DisputeClient:
    """
    Dispute API 클라이언트

    Zkest Disputes API와 상호작용하기 위한 메서드를 제공합니다.

    Example:
        ```python
        client = DisputeClient(DisputeClientOptions(
            base_url='https://api.zkest.com',
            api_key='your-api-key'
        ))

        # 분쟁 생성
        dispute = client.create(CreateDisputeDto(
            assignment_id='assignment-123',
            reason='Task not completed as specified',
            evidence={'files': ['ipfs://...']}
        ))

        # 분쟁 통계 조회
        stats = client.get_statistics()

        # 분쟁 에스컬레이션
        client.escalate('dispute-456')
        ```
    """

    def __init__(self, options: DisputeClientOptions):
        self.base_url = options.base_url.rstrip('/')
        self.timeout = options.timeout

        self.headers = {'Content-Type': 'application/json'}
        if options.api_key:
            self.headers['Authorization'] = f'Bearer {options.api_key}'

        # 세션 설정 (재시도 포함)
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
        """HTTP 요청 실행"""
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

    def create(self, dto: CreateDisputeDto) -> CoreDispute:
        """새 분쟁 생성"""
        data = {
            'assignmentId': dto.assignment_id,
            'reason': dto.reason,
            'evidence': dto.evidence,
        }

        result = self._request('POST', '/disputes', json=data)
        return self._parse_dispute(result['data'])

    def find_all(
        self, filter_dto: Optional[DisputeFilterDto] = None
    ) -> List[CoreDispute]:
        """필터링과 함께 모든 분쟁 조회"""
        params = {}
        if filter_dto:
            if filter_dto.assignment_id:
                params['assignmentId'] = filter_dto.assignment_id
            if filter_dto.initiator_id:
                params['initiatorId'] = filter_dto.initiator_id
            if filter_dto.arbitrator_id:
                params['arbitratorId'] = filter_dto.arbitrator_id
            if filter_dto.status:
                params['status'] = filter_dto.status.value
            if filter_dto.limit:
                params['limit'] = filter_dto.limit
            if filter_dto.offset:
                params['offset'] = filter_dto.offset

        result = self._request('GET', '/disputes', params=params)
        return [self._parse_dispute(item) for item in result['data']]

    def get_statistics(self) -> DisputeStatistics:
        """분쟁 통계 조회"""
        result = self._request('GET', '/disputes/statistics')
        data = result['data']

        return DisputeStatistics(
            total_disputes=data['totalDisputes'],
            open_disputes=data['openDisputes'],
            resolved_disputes=data['resolvedDisputes'],
            escalated_disputes=data['escalatedDisputes'],
            average_resolution_time=data['averageResolutionTime'],
            resolution_breakdown={
                DisputeResolution(k): v
                for k, v in data['resolutionBreakdown'].items()
            },
        )

    def find_one(self, dispute_id: str) -> CoreDispute:
        """ID로 분쟁 조회"""
        result = self._request('GET', f'/disputes/{dispute_id}')
        return self._parse_dispute(result['data'])

    def resolve(
        self, dispute_id: str, dto: ResolveDisputeDto
    ) -> CoreDispute:
        """분쟁 해결 (관리자 전용)"""
        data = {'resolution': dto.resolution.value}
        if dto.arbitrator_id:
            data['arbitratorId'] = dto.arbitrator_id

        result = self._request('PATCH', f'/disputes/{dispute_id}/resolve', json=data)
        return self._parse_dispute(result['data'])

    def escalate(self, dispute_id: str) -> CoreDispute:
        """분쟁 에스컬레이션"""
        result = self._request('PATCH', f'/disputes/{dispute_id}/escalate')
        return self._parse_dispute(result['data'])

    def find_by_assignment(self, assignment_id: str) -> List[CoreDispute]:
        """할당의 모든 분쟁 조회"""
        result = self._request(
            'GET', '/disputes', params={'assignmentId': assignment_id}
        )
        return [self._parse_dispute(item) for item in result['data']]

    def find_by_initiator(self, initiator_id: str) -> List[CoreDispute]:
        """시작자의 모든 분쟁 조회"""
        result = self._request(
            'GET', '/disputes', params={'initiatorId': initiator_id}
        )
        return [self._parse_dispute(item) for item in result['data']]

    def find_by_status(self, status: DisputeStatus) -> List[CoreDispute]:
        """상태별 분쟁 조회"""
        result = self._request('GET', '/disputes', params={'status': status.value})
        return [self._parse_dispute(item) for item in result['data']]

    def _parse_dispute(self, data: Dict[str, Any]) -> CoreDispute:
        """API 응답을 CoreDispute 객체로 변환"""
        resolution = None
        if data.get('resolution'):
            resolution = DisputeResolution(data['resolution'])

        return CoreDispute(
            id=data['id'],
            assignment_id=data['assignmentId'],
            initiator_id=data['initiatorId'],
            reason=data['reason'],
            status=DisputeStatus(data['status']),
            evidence=data.get('evidence', {}),
            resolution=resolution,
            arbitrator_id=data.get('arbitratorId'),
            stake_amount=data.get('stakeAmount', '0'),
            created_at=data.get('createdAt'),
            resolved_at=data.get('resolvedAt'),
        )
