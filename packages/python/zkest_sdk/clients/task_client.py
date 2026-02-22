"""
Task Client - Zkest Task Management API Client

@spec ADRL-0003
"""

from typing import List, Optional, Dict, Any
from dataclasses import dataclass
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from ..types import (
    Task,
    TaskStatus,
    CreateTaskDto,
    UpdateTaskDto,
    TaskFilterDto,
)


@dataclass
class TaskClientOptions:
    """Task 클라이언트 옵션"""

    base_url: str
    api_key: Optional[str] = None
    timeout: int = 30
    max_retries: int = 3


class TaskClient:
    """
    Task API 클라이언트

    Zkest Tasks API와 상호작용하기 위한 메서드를 제공합니다.

    Example:
        ```python
        client = TaskClient(TaskClientOptions(
            base_url='https://api.zkest.com',
            api_key='your-api-key'
        ))

        # 작업 생성
        task = client.create(CreateTaskDto(
            title='Data Processing',
            description='Process CSV files',
            budget='100.0',
            deadline=datetime(2024, 12, 31)
        ))

        # 필터링과 함께 작업 조회
        tasks = client.find_all(TaskFilterDto(status=TaskStatus.POSTED))

        # 에이전트 할당
        client.assign('task-123', 'agent-456')
        ```
    """

    def __init__(self, options: TaskClientOptions):
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

    def create(self, dto: CreateTaskDto) -> Task:
        """새 작업 생성"""
        data = {
            'title': dto.title,
            'description': dto.description,
            'budget': dto.budget,
        }
        if dto.requirements:
            data['requirements'] = dto.requirements
        if dto.token_address:
            data['tokenAddress'] = dto.token_address
        if dto.deadline:
            data['deadline'] = dto.deadline.isoformat()
        if dto.verification_tier:
            data['verificationTier'] = dto.verification_tier.value
        if dto.selection_criteria:
            data['selectionCriteria'] = {
                'method': dto.selection_criteria.method,
                'weights': dto.selection_criteria.weights,
                'minReputation': dto.selection_criteria.min_reputation,
                'maxDeliveryTime': dto.selection_criteria.max_delivery_time,
            }

        result = self._request('POST', '/tasks', json=data)
        return self._parse_task(result['data'])

    def find_all(
        self, filter_dto: Optional[TaskFilterDto] = None
    ) -> List[Task]:
        """필터링과 함께 모든 작업 조회"""
        params = {}
        if filter_dto:
            if filter_dto.status:
                params['status'] = filter_dto.status.value
            if filter_dto.requester_id:
                params['requesterId'] = filter_dto.requester_id
            if filter_dto.agent_id:
                params['agentId'] = filter_dto.agent_id
            if filter_dto.verification_tier:
                params['verificationTier'] = filter_dto.verification_tier.value
            if filter_dto.limit:
                params['limit'] = filter_dto.limit
            if filter_dto.offset:
                params['offset'] = filter_dto.offset

        result = self._request('GET', '/tasks', params=params)
        return [self._parse_task(item) for item in result['data']]

    def find_one(self, task_id: str) -> Task:
        """ID로 작업 조회"""
        result = self._request('GET', f'/tasks/{task_id}')
        return self._parse_task(result['data'])

    def update(self, task_id: str, dto: UpdateTaskDto) -> Task:
        """작업 수정"""
        data = {}
        if dto.title:
            data['title'] = dto.title
        if dto.description:
            data['description'] = dto.description
        if dto.requirements:
            data['requirements'] = dto.requirements
        if dto.budget:
            data['budget'] = dto.budget
        if dto.deadline:
            data['deadline'] = dto.deadline.isoformat()

        result = self._request('PATCH', f'/tasks/{task_id}', json=data)
        return self._parse_task(result['data'])

    def update_status(self, task_id: str, status: TaskStatus) -> Task:
        """작업 상태 업데이트"""
        result = self._request(
            'PATCH', f'/tasks/{task_id}/status', json={'status': status.value}
        )
        return self._parse_task(result['data'])

    def assign(self, task_id: str, agent_id: str) -> Task:
        """에이전트를 작업에 할당"""
        result = self._request(
            'POST', f'/tasks/{task_id}/assign', json={'agentId': agent_id}
        )
        return self._parse_task(result['data'])

    def cancel(self, task_id: str, reason: Optional[str] = None) -> Task:
        """작업 취소"""
        data = {}
        if reason:
            data['reason'] = reason

        result = self._request('POST', f'/tasks/{task_id}/cancel', json=data)
        return self._parse_task(result['data'])

    def _parse_task(self, data: Dict[str, Any]) -> Task:
        """API 응답을 Task 객체로 변환"""
        return Task(
            id=data['id'],
            title=data['title'],
            description=data['description'],
            task_type=data.get('taskType', 'other'),
            status=data['status'],
            budget=float(data.get('budget', 0)),
            deadline=data.get('deadline'),
            skills_required=data.get('skillsRequired', []),
            metadata=data.get('metadata', {}),
        )
