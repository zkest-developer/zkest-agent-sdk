"""
WebSocket 클라이언트

실시간 업데이트를 수신하기 위한 WebSocket 클라이언트입니다.

@spec ADRL-0004
"""

import asyncio
import json
import logging
from typing import Optional, Dict, Any, Callable, Awaitable, List
from datetime import datetime

import websockets
from websockets.exceptions import ConnectionClosed, ConnectionClosedError

from zkest_sdk.exceptions import WebSocketError
from zkest_sdk.types import Verification, Tier

logger = logging.getLogger(__name__)


EventHandler = Callable[[Dict[str, Any]], Awaitable[None]]


class VerificationStream:
    """
    검증 실시간 스트림

    WebSocket을 통해 검증 관련 실시간 업데이트를 수신합니다.
    """

    def __init__(
        self,
        ws_url: str,
        agent_id: str,
        api_key: Optional[str] = None,
    ):
        """
        스트림 초기화

        Args:
            ws_url: WebSocket URL (예: "wss://api.zkest.io")
            agent_id: 에이전트 ID
            api_key: API 키 (선택 사항)
        """
        self.ws_url = ws_url.rstrip("/")
        self.agent_id = agent_id
        self.api_key = api_key
        self._websocket: Optional[Any] = None
        self._connected = False
        self._event_handlers: Dict[str, List[EventHandler]] = {}
        self._listen_task: Optional[asyncio.Task] = None

    def on(self, event: str, handler: EventHandler) -> None:
        """
        이벤트 핸들러 등록

        Args:
            event: 이벤트 이름
            handler: 핸들러 함수
        """
        if event not in self._event_handlers:
            self._event_handlers[event] = []
        self._event_handlers[event].append(handler)
        logger.info(f"이벤트 핸들러 등록: {event}")

    def off(self, event: str, handler: Optional[EventHandler] = None) -> None:
        """
        이벤트 핸들러 제거

        Args:
            event: 이벤트 이름
            handler: 제거할 핸들러 (None인 경우 모든 핸들러 제거)
        """
        if event not in self._event_handlers:
            return

        if handler is None:
            del self._event_handlers[event]
        else:
            self._event_handlers[event] = [
                h for h in self._event_handlers[event] if h != handler
            ]

    async def connect(self) -> None:
        """WebSocket 연결"""
        if self._connected:
            logger.warning("이미 연결되어 있습니다.")
            return

        try:
            # 연결 URL에 인증 정보 추가
            url = f"{self.ws_url}?agentId={self.agent_id}"
            if self.api_key:
                url += f"&token={self.api_key}"

            self._websocket = await websockets.connect(url)
            self._connected = True
            logger.info("WebSocket 연결 완료")

            # 메시지 수신 시작
            self._listen_task = asyncio.create_task(self._listen_loop())

        except Exception as e:
            raise WebSocketError(f"WebSocket 연결 실패: {e}")

    async def disconnect(self) -> None:
        """연결 해제"""
        if not self._connected:
            return

        self._connected = False

        if self._listen_task:
            self._listen_task.cancel()
            try:
                await self._listen_task
            except asyncio.CancelledError:
                pass

        if self._websocket:
            await self._websocket.close()
            self._websocket = None

        logger.info("WebSocket 연결 해제")

    async def _listen_loop(self) -> None:
        """메시지 수신 루프"""
        while self._connected:
            try:
                message = await self._websocket.recv()
                data = json.loads(message)
                await self._handle_message(data)

            except ConnectionClosed:
                logger.warning("WebSocket 연결이 닫혔습니다.")
                break
            except json.JSONDecodeError as e:
                logger.error(f"JSON 파싱 오류: {e}")
            except Exception as e:
                logger.error(f"메시지 수신 중 오류: {e}")

    async def _handle_message(self, data: Dict[str, Any]) -> None:
        """
        메시지 처리

        Args:
            data: 메시지 데이터
        """
        event = data.get("event") or data.get("type")
        payload = data.get("data", data)

        if event and event in self._event_handlers:
            for handler in self._event_handlers[event]:
                try:
                    await handler(payload)
                except Exception as e:
                    logger.error(f"이벤트 핸들러 실행 중 오류 ({event}): {e}")

    async def join_agent_room(self, agent_id: str) -> None:
        """
        에이전트 룸 참여

        Args:
            agent_id: 에이전트 ID
        """
        if not self._connected:
            raise WebSocketError("연결되어 있지 않습니다.")

        message = {
            "action": "join",
            "room": f"agent:{agent_id}",
        }
        await self._send(message)
        logger.info(f"룸 참여: agent:{agent_id}")

    async def leave_agent_room(self, agent_id: str) -> None:
        """
        에이전트 룸 떠나기

        Args:
            agent_id: 에이전트 ID
        """
        if not self._connected:
            raise WebSocketError("연결되어 있지 않습니다.")

        message = {
            "action": "leave",
            "room": f"agent:{agent_id}",
        }
        await self._send(message)
        logger.info(f"룸 떠나기: agent:{agent_id}")

    async def subscribe_to_verifications(self, agent_id: str) -> None:
        """
        검증 이벤트 구독

        Args:
            agent_id: 에이전트 ID
        """
        if not self._connected:
            raise WebSocketError("연결되어 있지 않습니다.")

        message = {
            "action": "subscribe",
            "events": ["verification_submitted", "verification_approved", "verification_rejected"],
            "agentId": agent_id,
        }
        await self._send(message)
        logger.info("검증 이벤트 구독 완료")

    async def subscribe_to_escrows(self, agent_id: str) -> None:
        """
        에스크로 이벤트 구독

        Args:
            agent_id: 에이전트 ID
        """
        if not self._connected:
            raise WebSocketError("연결되어 있지 않습니다.")

        message = {
            "action": "subscribe",
            "events": ["escrow_created", "escrow_completed", "escrow_disputed"],
            "agentId": agent_id,
        }
        await self._send(message)
        logger.info("에스크로 이벤트 구독 완료")

    async def _send(self, message: Dict[str, Any]) -> None:
        """
        메시지 전송

        Args:
            message: 전송할 메시지
        """
        if not self._connected or not self._websocket:
            raise WebSocketError("연결되어 있지 않습니다.")

        try:
            await self._websocket.send(json.dumps(message))
        except Exception as e:
            raise WebSocketError(f"메시지 전송 실패: {e}")

    def connected(self) -> bool:
        """
        연결 상태 확인

        Returns:
            연결 여부
        """
        return self._connected

    async def __aenter__(self):
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.disconnect()
