"""
Ledger Client - Zkest Ledger API Client
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Dict, Any, List
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from ..types import (
    CoreLedgerEntry,
    CreateLedgerEntryDto,
    LedgerBatchResult,
    LedgerDirection,
    LedgerFilterDto,
    LedgerReferenceType,
    LedgerStatus,
    LedgerSummary,
)


@dataclass
class LedgerClientOptions:
    """Ledger 클라이언트 옵션"""

    base_url: str
    api_key: Optional[str] = None
    timeout: int = 30
    max_retries: int = 3


class LedgerClient:
    """Ledger API 클라이언트"""

    def __init__(self, options: LedgerClientOptions):
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

    def create_entry(self, dto: CreateLedgerEntryDto) -> CoreLedgerEntry:
        payload: Dict[str, Any] = {
            'referenceType': dto.reference_type.value,
            'referenceId': dto.reference_id,
            'tokenAddress': dto.token_address,
            'amount': dto.amount,
            'direction': dto.direction.value,
        }
        if dto.from_address:
            payload['fromAddress'] = dto.from_address
        if dto.to_address:
            payload['toAddress'] = dto.to_address
        if dto.metadata:
            payload['metadata'] = dto.metadata

        result = self._request('POST', '/ledger/entries', json=payload)
        return self._parse_entry(result['data'])

    def find_entries(self, filter_dto: Optional[LedgerFilterDto] = None) -> List[CoreLedgerEntry]:
        params: Dict[str, Any] = {}
        if filter_dto:
            if filter_dto.task_id:
                params['taskId'] = filter_dto.task_id
            if filter_dto.agent_id:
                params['agentId'] = filter_dto.agent_id
            if filter_dto.wallet:
                params['wallet'] = filter_dto.wallet
            if filter_dto.status:
                params['status'] = filter_dto.status.value
            if filter_dto.reference_type:
                params['referenceType'] = filter_dto.reference_type.value
            if filter_dto.reference_id:
                params['referenceId'] = filter_dto.reference_id
            if filter_dto.batch_id:
                params['batchId'] = filter_dto.batch_id
            if filter_dto.limit is not None:
                params['limit'] = filter_dto.limit
            if filter_dto.offset is not None:
                params['offset'] = filter_dto.offset

        result = self._request('GET', '/ledger/entries', params=params)
        return [self._parse_entry(item) for item in result.get('data', [])]

    def process_batch(self, limit: Optional[int] = None) -> LedgerBatchResult:
        payload = {'limit': limit} if limit is not None else {}
        result = self._request('POST', '/ledger/process-batch', json=payload)
        return LedgerBatchResult(
            batch_id=result['data'].get('batchId', ''),
            processed_count=int(result['data'].get('processedCount', 0)),
        )

    def get_summary(self) -> LedgerSummary:
        result = self._request('GET', '/ledger/summary')
        data = result['data']
        return LedgerSummary(
            total_entries=int(data.get('totalEntries', 0)),
            by_status=data.get('byStatus', {}),
            posted_volume=str(data.get('postedVolume', '0')),
        )

    def _parse_entry(self, data: Dict[str, Any]) -> CoreLedgerEntry:
        processed_at = data.get('processedAt')
        created_at = data.get('createdAt')
        updated_at = data.get('updatedAt')

        return CoreLedgerEntry(
            id=data['id'],
            reference_type=LedgerReferenceType(data['referenceType']),
            reference_id=data['referenceId'],
            from_address=data.get('fromAddress'),
            to_address=data.get('toAddress'),
            token_address=data['tokenAddress'],
            amount=data['amount'],
            direction=LedgerDirection(data['direction']),
            status=LedgerStatus(data['status']),
            batch_id=data.get('batchId'),
            metadata=data.get('metadata') or {},
            processed_at=datetime.fromisoformat(processed_at.replace('Z', '+00:00')) if processed_at else None,
            created_at=datetime.fromisoformat(created_at.replace('Z', '+00:00')) if created_at else None,
            updated_at=datetime.fromisoformat(updated_at.replace('Z', '+00:00')) if updated_at else None,
        )
