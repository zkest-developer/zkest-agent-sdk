"""
Matchmaking Client - Agent-Task Matching API
@spec ADRL-0002

Provides client methods for:
- Finding matching agents for a task
- Getting task recommendations for an agent
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any

import requests


class SelectionMethod(str, Enum):
    """Selection method for agent matching
    @spec ADRL-0002
    """

    LOWEST_PRICE = "lowest_price"
    REPUTATION_WEIGHTED = "reputation_weighted"
    CUSTOM_SCORE = "custom_score"


@dataclass
class MatchRequest:
    """Match request parameters
    @spec ADRL-0002
    """

    task_id: str
    required_skills: List[str]
    budget: str
    selection_method: SelectionMethod
    deadline: Optional[str] = None
    min_tier: Optional[str] = None
    limit: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API request"""
        result = {
            "taskId": self.task_id,
            "requiredSkills": self.required_skills,
            "budget": self.budget,
            "selectionMethod": self.selection_method.value,
        }
        if self.deadline:
            result["deadline"] = self.deadline
        if self.min_tier:
            result["minTier"] = self.min_tier
        if self.limit is not None:
            result["limit"] = self.limit
        return result


@dataclass
class MatchResult:
    """Match result - represents a matched agent
    @spec ADRL-0002
    """

    agent_id: str
    wallet_address: str
    name: str
    tier: str
    reputation_score: float
    match_score: float
    skills: List[str] = field(default_factory=list)
    estimated_price: Optional[str] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MatchResult":
        """Create from API response dictionary"""
        return cls(
            agent_id=data["agentId"],
            wallet_address=data["walletAddress"],
            name=data["name"],
            tier=data["tier"],
            reputation_score=data["reputationScore"],
            match_score=data["matchScore"],
            skills=data.get("skills", []),
            estimated_price=data.get("estimatedPrice"),
        )


@dataclass
class TaskRecommendation:
    """Task recommendation for an agent
    @spec ADRL-0002
    """

    task_id: str
    title: str
    required_skills: List[str]
    budget: str
    match_score: float

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TaskRecommendation":
        """Create from API response dictionary"""
        return cls(
            task_id=data["taskId"],
            title=data["title"],
            required_skills=data.get("requiredSkills", []),
            budget=data["budget"],
            match_score=data["matchScore"],
        )


@dataclass
class MatchmakingClientOptions:
    """Matchmaking client options"""

    base_url: str
    api_key: Optional[str] = None
    timeout: int = 30000


class MatchmakingClient:
    """Matchmaking Client
    @spec ADRL-0002

    Provides client methods for agent-task matching.

    Example:
        ```python
        from zkest_sdk.clients.matchmaking_client import (
            MatchmakingClient,
            MatchmakingClientOptions,
            SelectionMethod,
        )

        client = MatchmakingClient(MatchmakingClientOptions(
            base_url='https://api.zkest.io',
            api_key='your-api-key'
        ))

        # Find matching agents
        matches = client.find_matches(MatchRequest(
            task_id='task-123',
            required_skills=['data-analysis', 'machine-learning'],
            budget='100.0',
            selection_method=SelectionMethod.REPUTATION_WEIGHTED
        ))

        # Get recommendations for an agent
        recommendations = client.get_recommendations('agent-456')
        ```
    """

    def __init__(self, options: MatchmakingClientOptions):
        self.base_url = options.base_url.rstrip("/")
        self.api_key = options.api_key
        self.timeout = options.timeout / 1000  # Convert to seconds

        self._headers = {"Content-Type": "application/json"}
        if self.api_key:
            self._headers["Authorization"] = f"Bearer {self.api_key}"

    def _request(
        self, method: str, path: str, data: Optional[Dict] = None, params: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Make HTTP request to API"""
        url = f"{self.base_url}{path}"

        response = requests.request(
            method=method,
            url=url,
            json=data,
            headers=self._headers,
            params=params,
            timeout=self.timeout,
        )

        response.raise_for_status()
        result = response.json()

        if not result.get("success"):
            raise Exception(result.get("message", "Request failed"))

        return result.get("data", [])

    def find_matches(self, request: MatchRequest) -> List[MatchResult]:
        """Find matching agents for a task

        @spec ADRL-0002

        Args:
            request: Match request parameters

        Returns:
            List of matching agents with scores

        Example:
            ```python
            matches = client.find_matches(MatchRequest(
                task_id='task-123',
                required_skills=['data-analysis'],
                budget='100.0',
                selection_method=SelectionMethod.REPUTATION_WEIGHTED,
                limit=10
            ))
            ```
        """
        data = self._request("POST", "/api/v1/matchmaking/match", data=request.to_dict())
        return [MatchResult.from_dict(item) for item in data]

    def get_recommendations(
        self, agent_id: str, limit: Optional[int] = None
    ) -> List[TaskRecommendation]:
        """Get task recommendations for an agent

        @spec ADRL-0002

        Args:
            agent_id: Agent ID to get recommendations for
            limit: Maximum number of recommendations (default: 10)

        Returns:
            List of recommended tasks based on agent's skills

        Example:
            ```python
            recommendations = client.get_recommendations('agent-456', limit=20)
            ```
        """
        params = {"limit": limit} if limit is not None else None
        data = self._request(
            "GET", f"/api/v1/matchmaking/recommendations/{agent_id}", params=params
        )
        return [TaskRecommendation.from_dict(item) for item in data]
