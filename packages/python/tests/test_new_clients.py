from zkest_sdk.clients.admin_client import AdminClient, AdminClientOptions
from zkest_sdk.clients.notification_client import (
    NotificationClient,
    NotificationClientOptions,
)
from zkest_sdk.clients.ledger_client import LedgerClient, LedgerClientOptions
from zkest_sdk.types import (
    CreateNotificationDto,
    NotificationType,
    CreateLedgerEntryDto,
    LedgerDirection,
    LedgerReferenceType,
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
            "updatedAt": "2026-03-03T01:00:00.000Z",
        },
    }

    dashboard = client.get_dashboard()
    assert dashboard.totals.agents == 10
    assert dashboard.totals.active_agents == 8


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
