"""
Task Client - Zkest Task Management API Client

@spec ADRL-0003
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from ..types import (
    CoreTask,
    TaskStatus,
    TaskAssignment,
    TaskAssignmentStatus,
    SelectionCriteria,
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
        client.assign('task-123', 'agent-456', '10.5')
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

    def create(self, dto: CreateTaskDto) -> CoreTask:
        """새 작업 생성"""
        data = {
            'title': dto.title,
            'description': dto.description,
            'budget': dto.budget,
            'tokenAddress': dto.token_address,
            'verificationTier': dto.verification_tier,
        }
        if dto.requirements:
            data['requirements'] = dto.requirements
        if dto.acceptance_criteria:
            data['acceptanceCriteria'] = dto.acceptance_criteria
        if dto.deadline:
            data['deadline'] = dto.deadline.isoformat()
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
    ) -> List[CoreTask]:
        """필터링과 함께 모든 작업 조회"""
        params = {}
        if filter_dto:
            if filter_dto.status:
                params['status'] = filter_dto.status.value
            if filter_dto.requester_id:
                params['requesterId'] = filter_dto.requester_id
            if filter_dto.page:
                params['page'] = filter_dto.page
            if filter_dto.limit:
                params['limit'] = filter_dto.limit

        result = self._request('GET', '/tasks', params=params)
        return [self._parse_task(item) for item in result['data']]

    def find_one(self, task_id: str) -> CoreTask:
        """ID로 작업 조회"""
        result = self._request('GET', f'/tasks/{task_id}')
        return self._parse_task(result['data'])

    def update(self, task_id: str, dto: UpdateTaskDto) -> CoreTask:
        """작업 수정"""
        data = {}
        if dto.title:
            data['title'] = dto.title
        if dto.description:
            data['description'] = dto.description
        if dto.requirements:
            data['requirements'] = dto.requirements
        if dto.acceptance_criteria:
            data['acceptanceCriteria'] = dto.acceptance_criteria
        if dto.verification_tier:
            data['verificationTier'] = dto.verification_tier
        if dto.budget:
            data['budget'] = dto.budget
        if dto.token_address:
            data['tokenAddress'] = dto.token_address
        if dto.deadline:
            data['deadline'] = dto.deadline.isoformat()
        if dto.selection_criteria:
            data['selectionCriteria'] = {
                'method': dto.selection_criteria.method,
                'weights': dto.selection_criteria.weights,
                'minReputation': dto.selection_criteria.min_reputation,
                'maxDeliveryTime': dto.selection_criteria.max_delivery_time,
            }

        result = self._request('PATCH', f'/tasks/{task_id}', json=data)
        return self._parse_task(result['data'])

    def update_status(self, task_id: str, status: TaskStatus) -> CoreTask:
        """작업 상태 업데이트"""
        result = self._request(
            'PATCH', f'/tasks/{task_id}/status', json={'status': status.value}
        )
        return self._parse_task(result['data'])

    def assign(self, task_id: str, agent_id: str, price: str) -> TaskAssignment:
        """에이전트를 작업에 할당"""
        result = self._request(
            'POST', f'/tasks/{task_id}/assign', json={'agentId': agent_id, 'price': price}
        )
        return self._parse_assignment(result['data'])

    def cancel(self, task_id: str) -> CoreTask:
        """작업 취소"""
        result = self._request('POST', f'/tasks/{task_id}/cancel', json={})
        return self._parse_task(result['data'])

    def _parse_task(self, data: Dict[str, Any]) -> CoreTask:
        """API 응답을 Task 객체로 변환"""
        selection_criteria_data = data.get('selectionCriteria')
        selection_criteria: Optional[SelectionCriteria] = None
        if selection_criteria_data and isinstance(selection_criteria_data, dict):
            selection_criteria = SelectionCriteria(
                method=selection_criteria_data.get('method', 'lowest_price'),
                weights=selection_criteria_data.get('weights'),
                min_reputation=selection_criteria_data.get('minReputation'),
                max_delivery_time=selection_criteria_data.get('maxDeliveryTime'),
            )

        return CoreTask(
            id=data['id'],
            requester_id=data['requesterId'],
            title=data['title'],
            description=data['description'],
            budget=data['budget'],
            token_address=data['tokenAddress'],
            verification_tier=data['verificationTier'],
            status=TaskStatus(data['status']),
            requirements=data.get('requirements', {}),
            acceptance_criteria=data.get('acceptanceCriteria', {}),
            selection_criteria=selection_criteria,
            deadline=self._parse_datetime(data.get('deadline')),
            created_at=self._parse_datetime(data.get('createdAt')),
            updated_at=self._parse_datetime(data.get('updatedAt')),
        )

    def _parse_assignment(self, data: Dict[str, Any]) -> TaskAssignment:
        return TaskAssignment(
            id=data['id'],
            task_id=data['taskId'],
            agent_id=data['agentId'],
            price=data['price'],
            status=TaskAssignmentStatus(data['status']),
            started_at=self._parse_datetime(data.get('startedAt')),
            completed_at=self._parse_datetime(data.get('completedAt')),
            created_at=self._parse_datetime(data.get('createdAt')),
            updated_at=self._parse_datetime(data.get('updatedAt')),
        )

    @staticmethod
    def _parse_datetime(value: Optional[str]) -> Optional[datetime]:
        if not value:
            return None
        return datetime.fromisoformat(value.replace('Z', '+00:00'))
