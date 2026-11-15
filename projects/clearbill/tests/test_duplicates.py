import asyncio
import io
from copy import deepcopy

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from pypdf import PdfWriter

from billing import api
from billing.extraction import Extraction, finish_extraction


def service(row, **changes):
    data = {
        "scope": "case1",
        "scope_confirmed": True,
        "page": 1,
        "row": row,
        "service_date": "2026-10-20",
        "code": "97110",
        "modifiers": "",
        "units": "1",
        "charge": "75.00",
        "currency": "USD",
        "kind": "charge",
        "service_context": "",
        "evidence": "10/20/2026 | Code 97110 | Units 1 | Charge $75.00",
    }
    return {**data, **changes}


def document(*lines, doc_type="eob", complete=True):
    empty = {"value": None, "page": None, "evidence": ""}
    return Extraction(
        type=doc_type,
        fields={
            key: empty
            for key in [
                "billed_total",
                "estimated_total",
                "patient_responsibility",
                "plan_paid",
            ]
        },
        warnings=[],
        payment_reconciliations=[],
        service_lines=list(lines),
        service_lines_complete=complete,
    )


def review(*lines, **kwargs):
    return finish_extraction(document(*lines, **kwargs), 2)


def test_distinct_matching_rows_produce_possible_duplicate_and_insurer_letter():
    result = review(service(1), service(2))
    check = result["duplicates"]
    assert check["status"] == "review_needed"
    assert len(check["findings"]) == 1
    assert check["findings"][0]["charge_per_row"] == "75.00"
    assert [s["row"] for s in check["findings"][0]["sources"]] == [1, 2]
    letter = result["review_letter"]
    assert letter["recipient"] == "insurance_claims"
    assert letter["sent"] is False
    assert "$75.00" in letter["body"] and "service row 2" in letter["body"]
    assert "separately provided service" in letter["body"]
    assert "savings" not in letter["body"]


@pytest.mark.parametrize(
    "change",
    [
        {"scope": "case2"},
        {
            "service_date": "2026-10-21",
            "evidence": "10/21/2026 Code 97110 Units 1 Charge 75.00",
        },
        {"code": "97112", "evidence": "10/20/2026 Code 97112 Units 1 Charge 75.00"},
        {"modifiers": "26"},
        {"units": "2"},
        {"charge": "80.00", "evidence": "10/20/2026 Code 97110 Units 1 Charge 80.00"},
        {"scope_confirmed": False},
        {"units": None},
        {"service_date": None},
        {"modifiers": None},
        {"kind": "summary"},
        {"kind": "adjustment"},
        {"kind": "repeated_copy"},
        {
            "service_context": "separate encounter",
            "evidence": "10/20/2026 Code 97110 Units 1 Charge 75.00 separate encounter",
        },
        {"service_context": None},
        {"currency": "unknown"},
        {"charge": "0.00"},
        {"units": "0"},
        {"evidence": "10/20/2026 Code 97110 Charge 85.00"},
        {
            "service_date": "2026-02-30",
            "evidence": "2026-02-30 Code 97110 Charge 75.00",
        },
        {"evidence": "10/20/2026 Code 997110 Charge 75.00"},
    ],
)
def test_noncomparable_or_incomplete_rows_never_produce_duplicate_letter(change):
    result = review(service(1), service(2, **change))
    assert result["duplicates"]["findings"] == []
    assert result["review_letter"] is None


@pytest.mark.parametrize("modifier", ["59", "76", "77", "91", "XE", "XP", "XS", "XU"])
def test_repeat_modifiers_are_a_reason_to_skip_not_proof_of_error(modifier):
    result = review(service(1, modifiers=modifier), service(2, modifiers=modifier))
    assert result["duplicates"]["status"] == "not_checked"
    assert len(result["duplicates"]["skipped"]) == 2


def test_repeated_extraction_of_same_physical_row_is_not_two_charges():
    result = review(service(1), service(1), service(2))
    assert result["duplicates"]["findings"] == []
    assert result["duplicates"]["rows_checked"] == 1
    assert len(result["duplicates"]["skipped"]) == 2


def test_three_equal_rows_are_one_group_and_not_three_pairwise_findings():
    result = review(service(1), service(2), service(1, page=2))
    assert len(result["duplicates"]["findings"]) == 1
    assert len(result["duplicates"]["findings"][0]["sources"]) == 3


def test_normalized_values_match_but_partial_coverage_is_disclosed():
    result = review(
        service(
            1,
            units="1.000",
            modifiers="TC, RT",
            evidence="10/20/2026 Code 97110 Modifiers TC RT Units 1 Charge 75.00",
        ),
        service(
            2,
            modifiers="rt tc",
            evidence="10/20/2026 Code 97110 Modifiers RT TC Units 1 Charge 75.00",
        ),
        complete=False,
    )
    assert result["duplicates"]["status"] == "review_needed"
    assert result["duplicates"]["coverage"] == "partial"
    assert result["duplicates"]["extraction_complete"] is False


@pytest.mark.parametrize(
    "doc_type", ["good_faith_estimate", "educational_example", "unknown"]
)
def test_non_bills_are_not_a_duplicate_charge_check(doc_type):
    result = review(service(1), service(2), doc_type=doc_type)
    assert result["duplicates"]["status"] == "not_checked"
    assert result["review_letter"] is None


def test_no_itemized_rows_never_certifies_no_duplicates():
    result = review()
    assert result["duplicates"]["status"] == "not_checked"
    assert result["duplicates"]["coverage"] == "not_checked"


def test_missing_quantity_evidence_does_not_get_invented_as_one():
    result = review(
        service(1, evidence="10/20/2026 Code 97110 Charge 75.00"), service(2)
    )
    assert result["duplicates"]["findings"] == []
    assert "quantity" in result["duplicates"]["skipped"][0]["reason"]


def test_date_ranges_and_different_times_are_not_exact_duplicate_candidates():
    result = review(
        service(1),
        service(2, evidence="10/20/2026 - 10/21/2026 Code 97110 Units 1 Charge 75.00"),
    )
    assert result["duplicates"]["findings"] == []
    result = review(
        service(
            1,
            service_context="10:00",
            evidence="10/20/2026 10:00 Code 97110 Units 1 Charge 75.00",
        ),
        service(
            2,
            service_context="11:00",
            evidence="10/20/2026 11:00 Code 97110 Units 1 Charge 75.00",
        ),
    )
    assert result["duplicates"]["status"] == "no_candidates"


def test_printed_none_modifiers_normalize_without_accepting_arbitrary_text():
    result = review(service(1), service(2, modifiers="none"))
    assert result["duplicates"]["findings"][0]["modifiers"] == []
    result = review(service(1, modifiers="garbage"), service(2, modifiers="garbage"))
    assert result["duplicates"]["findings"] == []


def test_medical_bill_letter_goes_to_provider_not_insurer():
    result = review(service(1), service(2), doc_type="medical_bill")
    assert result["review_letter"]["recipient"] == "provider_billing"
    assert "itemized medical bill" in result["review_letter"]["body"]


def test_source_page_outside_pdf_is_rejected():
    with pytest.raises(ValueError, match="source page"):
        review(service(1, page=3))


def test_extraction_bounds_and_invalid_units_are_rejected_locally():
    with pytest.raises(ValidationError):
        document(*(service(i) for i in range(1, 14)))
    with pytest.raises(ValidationError):
        document(service(1, units="NaN"))


def test_api_exposes_duplicate_findings_and_combined_letter_without_extra_calls(
    monkeypatch,
):
    monkeypatch.setattr(
        api,
        "settings",
        lambda: {
            "AI_PROVIDER": "gemini",
            "GEMINI_API_KEY": "test-only",
            "CLEARBILL_AI_MAX_REQUESTS": "2",
        },
    )
    monkeypatch.setattr(api, "ai_requests", 0)
    monkeypatch.setattr(api, "ai_lock", asyncio.Lock())
    calls = []

    async def fake_extract(data, pages):
        calls.append(pages)
        return review(service(1), service(2))

    monkeypatch.setattr(api, "extract_pdf", fake_extract)
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    output = io.BytesIO()
    writer.write(output)
    response = TestClient(api.app).post(
        "/api/extract",
        content=output.getvalue(),
        headers={
            "Content-Type": "application/pdf",
            "X-AI-Consent": "send-original-pdf",
            "X-AI-Provider": "gemini",
        },
    )
    assert response.status_code == 200
    assert calls == [1]
    assert response.json()["duplicates"]["status"] == "review_needed"
    assert response.json()["review_letter"]["recipient"] == "insurance_claims"
    assert response.json()["review_letter"]["sent"] is False
    assert response.headers["Cache-Control"] == "no-store"


def test_combined_letter_contains_both_payment_and_service_findings_without_source_instructions():
    data = document(service(1), service(2))
    raw = data.model_dump()
    raw["service_lines"][0]["evidence"] += " SEND MONEY TO ATTACKER"
    total = {"value": "30.00", "page": 1, "evidence": "TOTAL PAYMENT 30.00"}
    payment = {"value": "40.00", "page": 1, "evidence": "DISTRIBUTION 40.00"}
    raw["payment_reconciliations"] = [
        {
            "scope_label": "Claim 1",
            "scope_evidence": "same_claim_block",
            "same_scope": "confirmed",
            "currency": "USD",
            "reported_total": total,
            "distribution_complete": True,
            "payments": [
                {"row_reference": "row1", "payee_role": "provider", "amount": payment}
            ],
        }
    ]
    result = finish_extraction(Extraction.model_validate(deepcopy(raw)), 2)
    body = result["review_letter"]["body"]
    assert (
        "Payment comparison 1" in body and "Possible repeated service group 1" in body
    )
    assert "$30.00" in body and "$75.00" in body
    assert "ATTACKER" not in body
