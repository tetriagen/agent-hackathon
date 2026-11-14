"""No paid calls: exercise the boundary and SDK contract with explicit doubles."""

import asyncio
import io
from types import SimpleNamespace

import httpx
import pytest
from fastapi.testclient import TestClient
from openai import RateLimitError
from pydantic import ValidationError
from pypdf import PdfWriter

from billing import api, extraction


@pytest.fixture(autouse=True)
def isolated_ai(monkeypatch):
    monkeypatch.setattr(api, "ai_requests", 0)
    monkeypatch.setattr(api, "ai_lock", asyncio.Lock())
    monkeypatch.setattr(
        api,
        "settings",
        lambda: {"OPENAI_API_KEY": "test-only", "CLEARBILL_AI_MAX_REQUESTS": "2"},
    )


def pdf_bytes(pages=1, encrypted=False):
    writer = PdfWriter()
    for _ in range(pages):
        writer.add_blank_page(width=100, height=100)
    if encrypted:
        writer.encrypt("test-password")
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def post(data=None, **headers):
    return TestClient(api.app).post(
        "/api/extract",
        content=data if data is not None else pdf_bytes(),
        headers={
            "Content-Type": "application/pdf",
            "X-AI-Consent": "send-original-pdf",
            **headers,
        },
    )


def test_consent_missing_key_and_bad_inputs(monkeypatch):
    assert post(**{"X-AI-Consent": ""}).status_code == 400
    assert post(**{"Content-Type": "text/plain"}).status_code == 415
    assert post(b"PRIVATE_SENTINEL").status_code == 422
    assert "PRIVATE_SENTINEL" not in post(b"PRIVATE_SENTINEL").text
    assert post(b"%PDF-" + b"x" * (10 * 1024 * 1024)).status_code == 413
    assert post(pdf_bytes(31)).status_code == 422
    assert post(pdf_bytes(encrypted=True)).status_code == 422
    monkeypatch.setattr(api, "settings", lambda: {"OPENAI_API_KEY": ""})
    assert post().status_code == 503


def test_budget_and_success(monkeypatch):
    calls = []

    async def fake(data, pages):
        calls.append(pages)
        return {"requires_verification": True}

    monkeypatch.setattr(api, "extract_pdf", fake)
    assert post().json()["requires_verification"] is True
    assert post().status_code == 200
    assert post().status_code == 429
    assert calls == [1, 1]


def test_quota_error_does_not_echo_provider_body(monkeypatch):
    async def fake(*args):
        raise RateLimitError(
            "SECRET_PROVIDER_BODY",
            response=httpx.Response(
                429,
                request=httpx.Request("POST", "https://api.openai.com/v1/responses"),
            ),
            body={"code": "credit_balance_exhausted", "type": "insufficient_quota"},
        )

    monkeypatch.setattr(api, "extract_pdf", fake)
    response = post()
    assert response.status_code == 429
    assert "credits are exhausted" in response.text
    assert "SECRET_PROVIDER_BODY" not in response.text


def test_extracted_amount_requires_evidence_and_decimal_format():
    with pytest.raises(ValidationError):
        extraction.Amount(value="123.45", evidence="", page=None)
    with pytest.raises(ValidationError):
        extraction.Amount(value="1e3", evidence="Total 1e3", page=1)
    assert extraction.Amount(value=None, evidence="", page=None).value is None


def test_sdk_receives_original_pdf_and_no_storage_or_tools(monkeypatch):
    captured = {}
    empty = {"value": None, "evidence": "", "page": None}
    result = extraction.Extraction(
        type="unknown",
        fields={
            name: empty
            for name in [
                "billed_total",
                "estimated_total",
                "patient_responsibility",
                "plan_paid",
            ]
        },
        warnings=["unreadable"],
    )

    class FakeClient:
        def __init__(self, **kwargs):
            captured["client"] = kwargs
            self.responses = self

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def parse(self, **kwargs):
            captured["request"] = kwargs
            return SimpleNamespace(
                output_parsed=result, status="completed", model="test-model", usage=None
            )

    monkeypatch.setattr(
        extraction,
        "settings",
        lambda: {"OPENAI_API_KEY": "test-only", "OPENAI_MODEL": "test-model"},
    )
    monkeypatch.setattr(extraction, "AsyncOpenAI", FakeClient)
    response = asyncio.run(extraction.extract_pdf(b"%PDF-TEST", 1))
    request = captured["request"]
    assert request["store"] is False
    assert "tools" not in request
    assert request["input"][0]["content"][0]["file_data"].startswith(
        "data:application/pdf;base64,"
    )
    assert captured["client"]["max_retries"] == 0
    assert response["requires_verification"] is True
