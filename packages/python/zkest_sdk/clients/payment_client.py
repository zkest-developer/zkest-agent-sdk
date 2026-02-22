"""
Payment Client - Zkest Payment Management API Client

@spec ADRL-0003
"""

from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from datetime import datetime
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from ..types import (
    CorePayment,
    PaymentType,
    PaymentStatus,
    CreatePaymentDto,
    PaymentFilterDto,
)


@dataclass
class PaymentClientOptions:
    """Payment 클라이언트 옵션"""

    base_url: str
    api_key: Optional[str] = None
    timeout: int = 30
    max_retries: int = 3


@dataclass
class PaymentStatistics:
    """결제 통계"""

    total_payments: int
    total_amount: str
    by_status: Dict[PaymentStatus, int]
    by_type: Dict[PaymentType, str]
    average_confirmation_time: float


@dataclass
class UpdatePaymentStatusDto:
    """결제 상태 업데이트 DTO"""

    status: PaymentStatus
    tx_hash: Optional[str] = None


class PaymentClient:
    """
    Payment API 클라이언트

    Zkest Payments API와 상호작용하기 위한 메서드를 제공합니다.

    Example:
        ```python
        client = PaymentClient(PaymentClientOptions(
            base_url='https://api.zkest.com',
            api_key='your-api-key'
        ))

        # 할당의 모든 결제 조회
        payments = client.find_by_assignment('assignment-123')

        # 결제 상태 업데이트
        client.update_status('payment-456', UpdatePaymentStatusDto(
            status=PaymentStatus.CONFIRMED,
            tx_hash='0x...'
        ))
        ```
    """

    def __init__(self, options: PaymentClientOptions):
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

    def create(self, dto: CreatePaymentDto) -> CorePayment:
        """새 결제 생성"""
        data = {
            'assignmentId': dto.assignment_id,
            'fromAddress': dto.from_address,
            'toAddress': dto.to_address,
            'amount': dto.amount,
            'tokenAddress': dto.token_address,
            'type': dto.type.value,
        }

        result = self._request('POST', '/payments', json=data)
        return self._parse_payment(result['data'])

    def find_all(self, filter_dto: Optional[PaymentFilterDto] = None) -> List[CorePayment]:
        """필터링과 함께 모든 결제 조회"""
        params = {}
        if filter_dto:
            if filter_dto.assignment_id:
                params['assignmentId'] = filter_dto.assignment_id
            if filter_dto.status:
                params['status'] = filter_dto.status.value
            if filter_dto.type:
                params['type'] = filter_dto.type.value
            if filter_dto.from_address:
                params['fromAddress'] = filter_dto.from_address
            if filter_dto.to_address:
                params['toAddress'] = filter_dto.to_address
            if filter_dto.limit:
                params['limit'] = filter_dto.limit
            if filter_dto.offset:
                params['offset'] = filter_dto.offset

        result = self._request('GET', '/payments', params=params)
        return [self._parse_payment(item) for item in result['data']]

    def get_statistics(self) -> PaymentStatistics:
        """결제 통계 조회"""
        result = self._request('GET', '/payments/statistics')
        data = result['data']

        return PaymentStatistics(
            total_payments=data['totalPayments'],
            total_amount=data['totalAmount'],
            by_status={
                PaymentStatus(k): v for k, v in data['byStatus'].items()
            },
            by_type={
                PaymentType(k): v for k, v in data['byType'].items()
            },
            average_confirmation_time=data['averageConfirmationTime'],
        )

    def find_one(self, payment_id: str) -> CorePayment:
        """ID로 결제 조회"""
        result = self._request('GET', f'/payments/{payment_id}')
        return self._parse_payment(result['data'])

    def find_by_assignment(self, assignment_id: str) -> List[CorePayment]:
        """할당의 모든 결제 조회"""
        result = self._request('GET', f'/payments/assignment/{assignment_id}')
        return [self._parse_payment(item) for item in result['data']]

    def find_by_address(self, address: str) -> List[CorePayment]:
        """주소의 모든 결제 조회"""
        result = self._request('GET', f'/payments/address/{address}')
        return [self._parse_payment(item) for item in result['data']]

    def update_status(
        self, payment_id: str, dto: UpdatePaymentStatusDto
    ) -> CorePayment:
        """결제 상태 업데이트"""
        data = {'status': dto.status.value}
        if dto.tx_hash:
            data['txHash'] = dto.tx_hash

        result = self._request('POST', f'/payments/{payment_id}/status', json=data)
        return self._parse_payment(result['data'])

    def _parse_payment(self, data: Dict[str, Any]) -> CorePayment:
        """API 응답을 CorePayment 객체로 변환"""
        return CorePayment(
            id=data['id'],
            assignment_id=data['assignmentId'],
            from_address=data['fromAddress'],
            to_address=data['toAddress'],
            amount=data['amount'],
            token_address=data['tokenAddress'],
            type=PaymentType(data['type']),
            status=PaymentStatus(data['status']),
            tx_hash=data.get('txHash'),
            fee_amount=data.get('feeAmount'),
            created_at=data.get('createdAt'),
            confirmed_at=data.get('confirmedAt'),
        )
