"""
Bid Client - Zkest Bid Management API Client

@spec ADRL-0003
"""

from typing import List, Optional, Dict, Any
from dataclasses import dataclass
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from ..types import (
    Bid,
    BidStatus,
    CreateBidDto,
    UpdateBidDto,
    BidFilterDto,
)


@dataclass
class BidClientOptions:
    """Bid 클라이언트 옵션"""

    base_url: str
    api_key: Optional[str] = None
    timeout: int = 30
    max_retries: int = 3


class BidClient:
    """
    Bid API 클라이언트

    Zkest Bids API와 상호작용하기 위한 메서드를 제공합니다.

    Example:
        ```python
        client = BidClient(BidClientOptions(
            base_url='https://api.zkest.com',
            api_key='your-api-key'
        ))

        # 입찰 생성
        bid = client.create(CreateBidDto(
            task_id='task-123',
            agent_id='agent-456',
            price='100.0',
            estimated_duration_hours=24
        ))

        # 작업의 모든 입찰 조회
        bids = client.find_by_task('task-123')

        # 입찰 수락
        client.accept('bid-789')
        ```
    """

    def __init__(self, options: BidClientOptions):
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

    def create(self, dto: CreateBidDto) -> Bid:
        """새 입찰 생성"""
        data = {
            'taskId': dto.task_id,
            'agentId': dto.agent_id,
            'price': dto.price,
            'estimatedDurationHours': dto.estimated_duration_hours,
        }
        if dto.proposal:
            data['proposal'] = dto.proposal

        result = self._request('POST', '/bids', json=data)
        return self._parse_bid(result['data'])

    def find_all(self, filter_dto: Optional[BidFilterDto] = None) -> List[Bid]:
        """필터링과 함께 모든 입찰 조회"""
        params = {}
        if filter_dto:
            if filter_dto.task_id:
                params['taskId'] = filter_dto.task_id
            if filter_dto.agent_id:
                params['agentId'] = filter_dto.agent_id
            if filter_dto.status:
                params['status'] = filter_dto.status.value
            if filter_dto.limit:
                params['limit'] = filter_dto.limit
            if filter_dto.offset:
                params['offset'] = filter_dto.offset

        result = self._request('GET', '/bids', params=params)
        return [self._parse_bid(item) for item in result['data']]

    def find_one(self, bid_id: str) -> Bid:
        """ID로 입찰 조회"""
        result = self._request('GET', f'/bids/{bid_id}')
        return self._parse_bid(result['data'])

    def update(self, bid_id: str, dto: UpdateBidDto) -> Bid:
        """대기 중인 입찰 수정"""
        data: Dict[str, Any] = {}
        if dto.price is not None:
            data['price'] = dto.price
        if dto.estimated_duration_hours is not None:
            data['estimatedDurationHours'] = dto.estimated_duration_hours
        if dto.proposal is not None:
            data['proposal'] = dto.proposal

        result = self._request('PATCH', f'/bids/{bid_id}', json=data)
        return self._parse_bid(result['data'])

    def find_by_task(self, task_id: str) -> List[Bid]:
        """작업의 모든 입찰 조회"""
        result = self._request('GET', f'/bids/task/{task_id}')
        return [self._parse_bid(item) for item in result['data']]

    def find_by_agent(
        self, agent_id: str, filter_dto: Optional[BidFilterDto] = None
    ) -> List[Bid]:
        """에이전트의 모든 입찰 조회"""
        params = {'agentId': agent_id}
        if filter_dto:
            if filter_dto.status:
                params['status'] = filter_dto.status.value
            if filter_dto.limit:
                params['limit'] = filter_dto.limit
            if filter_dto.offset:
                params['offset'] = filter_dto.offset

        result = self._request('GET', '/bids', params=params)
        return [self._parse_bid(item) for item in result['data']]

    def accept(self, bid_id: str) -> Bid:
        """입찰 수락"""
        result = self._request('PATCH', f'/bids/{bid_id}/accept')
        return self._parse_bid(result['data'])

    def reject(self, bid_id: str) -> Bid:
        """입찰 거절"""
        result = self._request('PATCH', f'/bids/{bid_id}/reject')
        return self._parse_bid(result['data'])

    def withdraw(self, bid_id: str) -> Bid:
        """입찰 철회"""
        result = self._request('PATCH', f'/bids/{bid_id}/withdraw')
        return self._parse_bid(result['data'])

    def _parse_bid(self, data: Dict[str, Any]) -> Bid:
        """API 응답을 Bid 객체로 변환"""
        return Bid(
            id=data['id'],
            task_id=data['taskId'],
            agent_id=data['agentId'],
            price=data['price'],
            estimated_duration_hours=data['estimatedDurationHours'],
            status=BidStatus(data['status']),
            proposal=data.get('proposal'),
            created_at=data.get('createdAt'),
            updated_at=data.get('updatedAt'),
        )
