import pytest
from fastapi.testclient import TestClient

from billing.api import app

client = TestClient(app)


def facts(**changes):
    return {
        "estimate_amount": "900.00",
        "billed_amount": "1650.00",
        "payment_type": "self_pay",
        "same_provider": True,
        "estimate_received": True,
        "within_120_days": True,
        **changes,
    }


@pytest.mark.parametrize(
    "estimate,bill,difference,status",
    [
        ("900", "1650", "750.00", "review_recommended"),
        ("900", "1300", "400.00", "review_recommended"),
        ("900", "1299.99", "399.99", "below_threshold"),
        ("0.10", "400.09", "399.99", "below_threshold"),
        ("900", "800", "-100.00", "below_threshold"),
    ],
)
def test_money_boundaries(estimate, bill, difference, status):
    response = client.post(
        "/api/review", json=facts(estimate_amount=estimate, billed_amount=bill)
    )
    assert response.status_code == 200
    assert response.json()["difference"] == difference
    assert response.json()["status"] == status


@pytest.mark.parametrize(
    "changes,status",
    [
        ({"same_provider": None}, "needs_information"),
        ({"estimate_received": None}, "needs_information"),
        ({"payment_type": "unknown"}, "needs_information"),
        ({"within_120_days": None}, "needs_information"),
        ({"payment_type": "insurance"}, "outside_scope"),
        ({"same_provider": False}, "outside_scope"),
        ({"estimate_received": False}, "outside_scope"),
        ({"within_120_days": False}, "outside_scope"),
    ],
)
def test_missing_and_unsupported_facts(changes, status):
    assert client.post("/api/review", json=facts(**changes)).json()["status"] == status


@pytest.mark.parametrize(
    "value", ["-1", "NaN", "Infinity", "1e3", "1,200", "1.234", "", 900, True]
)
def test_reject_invalid_amounts(value):
    assert (
        client.post("/api/review", json=facts(billed_amount=value)).status_code == 422
    )


def test_reject_raw_text_without_echoing_it():
    response = client.post(
        "/api/review", json=facts(document_text="PRIVATE_SYNTHETIC_SENTINEL")
    )
    assert response.status_code == 422
    assert "PRIVATE_SYNTHETIC_SENTINEL" not in response.text


def test_request_limits_and_malformed_json():
    headers = {"Content-Type": "application/json"}
    assert (
        client.post("/api/review", content="x" * 8193, headers=headers).status_code
        == 413
    )
    assert client.post("/api/review", content="{", headers=headers).status_code == 422
    assert client.post("/api/review", content="plain text").status_code == 415


def test_no_persistent_state_and_same_origin_headers(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    response = client.post("/api/review", json=facts())
    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-store"
    assert "access-control-allow-origin" not in response.headers
    assert list(tmp_path.iterdir()) == []


def test_static_ui_and_health(monkeypatch):
    monkeypatch.setattr("billing.api.settings", lambda: {"OPENAI_API_KEY": ""})
    assert client.get("/").status_code == 200
    assert client.get("/api/health").json()["ai_enabled"] is False
