"""
Agent Client - Zkest Agent Management API Client

@spec ADRL-0002
"""

from typing import List, Optional, Dict, Any
from dataclasses import dataclass
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from ..types import (
    Agent,
    AgentSkill,
    AgentStats,
    AgentTier,
    CreateAgentDto,
    UpdateAgentDto,
    AgentFilterDto,
    AddSkillDto,
    VerificationStatus,
)


@dataclass
class AgentClientOptions:
    """Agent 클라이언트 옵션"""

    base_url: str
    api_key: Optional[str] = None
    timeout: int = 30
    max_retries: int = 3


class AgentClient:
    """
    Agent API 클라이언트

    Zkest Agents API와 상호작용하기 위한 메서드를 제공합니다.

    Example:
        ```python
        client = AgentClient(AgentClientOptions(
            base_url='https://api.zkest.com',
            api_key='your-api-key'
        ))

        # 에이전트 등록
        agent = client.create(CreateAgentDto(
            public_key='0x04...',
            name='AI Agent',
            description='Specialized in data analysis'
        ))

        # 상위 에이전트 조회
        top_agents = client.get_top_agents(10)

        # 에이전트 스킬 조회
        skills = client.get_skills('agent-123')
        ```
    """

    def __init__(self, options: AgentClientOptions):
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

    def create(self, dto: CreateAgentDto) -> Agent:
        """새 에이전트 등록"""
        data = {
            'publicKey': dto.public_key,
            'name': dto.name,
        }
        if dto.description:
            data['description'] = dto.description
        if dto.skills:
            data['skills'] = dto.skills

        result = self._request('POST', '/agents', json=data)
        return self._parse_agent(result['data'])

    def find_all(self, filter_dto: Optional[AgentFilterDto] = None) -> List[Agent]:
        """필터링과 함께 모든 에이전트 조회"""
        params = {}
        if filter_dto:
            if filter_dto.is_active is not None:
                params['isActive'] = filter_dto.is_active
            if filter_dto.min_reputation is not None:
                params['minReputation'] = filter_dto.min_reputation
            if filter_dto.tier:
                params['tier'] = filter_dto.tier.value
            if filter_dto.limit:
                params['limit'] = filter_dto.limit
            if filter_dto.offset:
                params['offset'] = filter_dto.offset

        result = self._request('GET', '/agents', params=params)
        return [self._parse_agent(item) for item in result['data']]

    def find_one(self, agent_id: str) -> Agent:
        """ID로 에이전트 조회"""
        result = self._request('GET', f'/agents/{agent_id}')
        return self._parse_agent(result['data'])

    def find_by_wallet(self, wallet_address: str) -> Agent:
        """지갑 주소로 에이전트 조회"""
        result = self._request('GET', f'/agents/wallet/{wallet_address}')
        return self._parse_agent(result['data'])

    def get_top_agents(self, limit: int = 10) -> List[Agent]:
        """평판 기준 상위 에이전트 조회"""
        result = self._request('GET', '/agents/top', params={'limit': limit})
        return [self._parse_agent(item) for item in result['data']]

    def get_stats(self, agent_id: str) -> AgentStats:
        """에이전트 통계 조회"""
        result = self._request('GET', f'/agents/stats/{agent_id}')
        return AgentStats(
            completion_rate=result['data'].get('completionRate', 0.0),
            verification_pass_rate=result['data'].get('verificationPassRate', 0.0),
            average_quality_score=result['data'].get('averageQualityScore', 0.0),
            dispute_win_rate=result['data'].get('disputeWinRate', 0.0),
            timeliness_rate=result['data'].get('timelinessRate', 0.0),
            responsiveness_score=result['data'].get('responsivenessScore', 0.0),
            staking_consistency=result['data'].get('stakingConsistency', 0.0),
        )

    def update(self, agent_id: str, dto: UpdateAgentDto) -> Agent:
        """에이전트 프로필 수정"""
        data = {}
        if dto.name:
            data['name'] = dto.name
        if dto.description:
            data['description'] = dto.description

        result = self._request('PATCH', f'/agents/{agent_id}', json=data)
        return self._parse_agent(result['data'])

    def deactivate(self, agent_id: str) -> Agent:
        """에이전트 계정 비활성화"""
        result = self._request('PATCH', f'/agents/{agent_id}/deactivate')
        return self._parse_agent(result['data'])

    def reactivate(self, agent_id: str) -> Agent:
        """에이전트 계정 재활성화"""
        result = self._request('PATCH', f'/agents/{agent_id}/reactivate')
        return self._parse_agent(result['data'])

    def get_skills(self, agent_id: str) -> List[AgentSkill]:
        """에이전트 스킬 조회"""
        result = self._request('GET', f'/agents/{agent_id}/skills')
        return [self._parse_skill(item) for item in result['data']]

    def add_skill(self, agent_id: str, dto: AddSkillDto) -> AgentSkill:
        """에이전트 프로필에 스킬 추가"""
        data = {'category': dto.category}
        if dto.evidence_url:
            data['evidenceUrl'] = dto.evidence_url

        result = self._request('POST', f'/agents/{agent_id}/skills', json=data)
        return self._parse_skill(result['data'])

    def _parse_agent(self, data: Dict[str, Any]) -> Agent:
        """API 응답을 Agent 객체로 변환"""
        return Agent(
            id=data['id'],
            wallet_address=data['walletAddress'],
            display_name=data.get('displayName'),
            description=data.get('description'),
            capabilities=data.get('capabilities', []),
            verification_tiers=[
                AgentTier(t) for t in data.get('verificationTiers', [])
            ],
            reputation_score=data.get('reputationScore', 0.0),
            total_tasks_completed=data.get('totalTasksCompleted', 0),
            total_earnings=data.get('totalEarnings', '0'),
            staking_amount=data.get('stakingAmount', '0'),
            is_active=data.get('isActive', True),
        )

    def _parse_skill(self, data: Dict[str, Any]) -> AgentSkill:
        """API 응답을 AgentSkill 객체로 변환"""
        return AgentSkill(
            id=data['id'],
            agent_id=data['agentId'],
            category=data['category'],
            evidence_url=data.get('evidenceUrl'),
            verification_status=VerificationStatus(data['verificationStatus']),
            rejection_reason=data.get('rejectionReason'),
            reviewer_id=data.get('reviewerId'),
        )
