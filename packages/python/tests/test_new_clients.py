from zkest_sdk.clients.admin_client import AdminClient, AdminClientOptions
from zkest_sdk.clients.bid_client import BidClient, BidClientOptions
from zkest_sdk.clients.notification_client import (
    NotificationClient,
    NotificationClientOptions,
)
from zkest_sdk.clients.ledger_client import LedgerClient, LedgerClientOptions
from zkest_sdk.clients.task_client import TaskClient, TaskClientOptions
from zkest_sdk.clients.payment_client import PaymentClient, PaymentClientOptions
from zkest_sdk.types import (
    CreateNotificationDto,
    NotificationType,
    CreateLedgerEntryDto,
    LedgerDirection,
    LedgerReferenceType,
    LedgerFilterDto,
    TaskFilterDto,
    TaskStatus,
    PaymentFilterDto,
    UpdateBidDto,
)


def test_admin_client_get_dashboard_parsing():
    client = AdminClient(AdminClientOptions(base_url="https://api.test.com", api_key="k"))
    client._request = lambda method, path, params=None, json=None: {
        "success": True,
        "data": {
            "totals": {
                "agents": 10,
                "activeAgents": 8,
                "tasks": 5,
                "escrows": 4,
                "disputes": 1,
                "payments": 6,
            },
            "alerts": {
                "openDisputes": 1,
                "failedPayouts": 2,
                "pendingVerifications": 3,
                "unreadAlerts": 4,
            },
            "updatedAt": "2026-03-03T01:00:00.000Z",
        },
    }

    dashboard = client.get_dashboard()
    assert dashboard.totals.agents == 10
    assert dashboard.totals.active_agents == 8
    assert dashboard.alerts.open_disputes == 1
    assert dashboard.alerts.unread_alerts == 4


def test_notification_client_create_and_unread_count():
    client = NotificationClient(
        NotificationClientOptions(base_url="https://api.test.com", api_key="k")
    )

    def fake_request(method, path, params=None, json=None):
        if path == "/notifications/unread-count":
            return {"success": True, "data": {"unreadCount": 3}}

        return {
            "success": True,
            "data": {
                "id": "n1",
                "recipientWallet": json["recipientWallet"],
                "type": json["type"],
                "title": json["title"],
                "message": json["message"],
                "metadata": json.get("metadata", {}),
                "isRead": False,
                "createdAt": "2026-03-03T01:00:00.000Z",
                "updatedAt": "2026-03-03T01:00:00.000Z",
            },
        }

    client._request = fake_request

    notification = client.create(
        CreateNotificationDto(
            recipient_wallet="0xabc",
            type=NotificationType.SYSTEM,
            title="t",
            message="m",
        )
    )

    assert notification.id == "n1"
    assert notification.type == NotificationType.SYSTEM
    assert client.get_unread_count() == 3


def test_ledger_client_create_and_summary():
    client = LedgerClient(LedgerClientOptions(base_url="https://api.test.com", api_key="k"))

    def fake_request(method, path, params=None, json=None):
        if path == "/ledger/summary":
            return {
                "success": True,
                "data": {
                    "totalEntries": 7,
                    "byStatus": {"posted": 6, "pending": 1},
                    "postedVolume": "12.5",
                },
            }

        return {
            "success": True,
            "data": {
                "id": "l1",
                "referenceType": json["referenceType"],
                "referenceId": json["referenceId"],
                "tokenAddress": json["tokenAddress"],
                "amount": json["amount"],
                "direction": json["direction"],
                "status": "pending",
                "createdAt": "2026-03-03T01:00:00.000Z",
                "updatedAt": "2026-03-03T01:00:00.000Z",
            },
        }

    client._request = fake_request

    entry = client.create_entry(
        CreateLedgerEntryDto(
            reference_type=LedgerReferenceType.PAYMENT,
            reference_id="p1",
            token_address="0xabc",
            amount="1",
            direction=LedgerDirection.CREDIT,
        )
    )

    assert entry.id == "l1"
    summary = client.get_summary()
    assert summary.total_entries == 7
    assert summary.posted_volume == "12.5"


def test_ledger_client_maps_reference_id_filter():
    client = LedgerClient(LedgerClientOptions(base_url="https://api.test.com", api_key="k"))

    captured = {}

    def fake_request(method, path, params=None, json=None):
        captured["path"] = path
        captured["params"] = params
        return {"success": True, "data": []}

    client._request = fake_request
    client.find_entries(
        LedgerFilterDto(
            reference_type=LedgerReferenceType.PAYMENT,
            reference_id="payment-1",
            limit=20,
            offset=0,
        )
    )

    assert captured["path"] == "/ledger/entries"
    assert captured["params"]["referenceType"] == "payment"
    assert captured["params"]["referenceId"] == "payment-1"


def test_bid_client_update_uses_patch_contract():
    client = BidClient(BidClientOptions(base_url="https://api.test.com", api_key="k"))

    captured = {}

    def fake_request(method, path, params=None, json=None):
        captured["method"] = method
        captured["path"] = path
        captured["json"] = json
        return {
            "success": True,
            "data": {
                "id": "b1",
                "taskId": "t1",
                "agentId": "a1",
                "price": json.get("price", "100"),
                "estimatedDurationHours": json.get("estimatedDurationHours", 24),
                "proposal": json.get("proposal"),
                "status": "pending",
                "createdAt": "2026-03-03T01:00:00.000Z",
                "updatedAt": "2026-03-03T01:00:00.000Z",
            },
        }

    client._request = fake_request

    updated = client.update(
        "b1",
        UpdateBidDto(price="120", estimated_duration_hours=12, proposal="updated"),
    )

    assert captured["method"] == "PATCH"
    assert captured["path"] == "/bids/b1"
    assert captured["json"] == {
        "price": "120",
        "estimatedDurationHours": 12,
        "proposal": "updated",
    }
    assert updated.price == "120"


def test_task_client_assign_requires_price_and_returns_assignment():
    client = TaskClient(TaskClientOptions(base_url="https://api.test.com", api_key="k"))

    captured = {}

    def fake_request(method, path, params=None, json=None):
        captured["method"] = method
        captured["path"] = path
        captured["json"] = json
        return {
            "success": True,
            "data": {
                "id": "a1",
                "taskId": "t1",
                "agentId": "ag1",
                "price": "15.0",
                "status": "assigned",
                "createdAt": "2026-03-03T01:00:00.000Z",
                "updatedAt": "2026-03-03T01:00:00.000Z",
            },
        }

    client._request = fake_request
    assignment = client.assign("t1", "ag1", "15.0")

    assert captured["method"] == "POST"
    assert captured["path"] == "/tasks/t1/assign"
    assert captured["json"] == {"agentId": "ag1", "price": "15.0"}
    assert assignment.price == "15.0"
    assert assignment.status.value == "assigned"


def test_task_client_find_all_uses_page_limit_filters():
    client = TaskClient(TaskClientOptions(base_url="https://api.test.com", api_key="k"))

    captured = {}

    def fake_request(method, path, params=None, json=None):
        captured["params"] = params
        return {"success": True, "data": []}

    client._request = fake_request
    client.find_all(TaskFilterDto(status=TaskStatus.POSTED, requester_id="r1", page=2, limit=10))

    assert captured["params"] == {
        "status": "posted",
        "requesterId": "r1",
        "page": 2,
        "limit": 10,
    }


def test_payment_client_stats_and_address_filter_mapping():
    client = PaymentClient(PaymentClientOptions(base_url="https://api.test.com", api_key="k"))

    captured = {}

    def fake_request(method, path, params=None, json=None):
        if path == "/payments/statistics":
            return {
                "success": True,
                "data": {
                    "totalPayments": 4,
                    "byStatus": {"pending": 1, "confirmed": 3},
                    "byType": {"payment": 3, "fee": 1},
                    "totalVolume": "88.5",
                },
            }

        captured["params"] = params
        return {"success": True, "data": []}

    client._request = fake_request

    stats = client.get_statistics()
    assert stats.total_payments == 4
    assert stats.by_type["payment"] == 3
    assert stats.total_volume == "88.5"

    client.find_all(PaymentFilterDto(from_address="0xabc"))
    assert captured["params"]["address"] == "0xabc"
