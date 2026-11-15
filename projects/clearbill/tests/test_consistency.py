"""Meaningful money/scope cases, using synthetic evidence rather than one sample."""

from copy import deepcopy

import pytest
from pydantic import ValidationError

from billing.consistency import check_payments
from billing.extraction import Extraction, finish_extraction


def amount(value, label="TOTAL PAYMENT AMOUNT", page=1):
    return {
        "value": value,
        "evidence": f"{label} {value}" if value is not None else "",
        "page": page if value is not None else None,
    }


def example(total="120.10", rows=("90.10", "30.00")):
    return {
        "type": "eob",
        "fields": {
            name: amount(None)
            for name in [
                "billed_total",
                "estimated_total",
                "patient_responsibility",
                "plan_paid",
            ]
        },
        "warnings": [],
        "service_lines": [],
        "service_lines_complete": False,
        "payment_reconciliations": [
            {
                "scope_label": "Claim 1",
                "scope_evidence": "same_claim_block",
                "same_scope": "confirmed",
                "currency": "USD",
                "reported_total": amount(total),
                "distribution_complete": True,
                "payments": [
                    {
                        "row_reference": f"row{i}",
                        "payee_role": "provider",
                        "amount": amount(value, "PAYMENT DISTRIBUTION PROVIDER"),
                    }
                    for i, value in enumerate(rows)
                ],
            }
        ],
    }


def check(data):
    return check_payments(Extraction.model_validate(data))


def test_equal_split_payments_do_not_trigger_a_warning():
    result = check(example())
    assert result["status"] == "checked"
    assert result["checks"][0]["difference"] == "0.00"
    assert result["checks"][0]["distribution_total"] == "120.10"


@pytest.mark.parametrize(
    "total,rows,difference",
    [
        ("43.06", ("53.83", "0.00"), "10.77"),
        ("250.00", ("90.00", "150.00"), "-10.00"),
        ("0.30", ("0.10", "0.21"), "0.01"),
    ],
)
def test_discrepancy_is_computed_from_any_amounts(total, rows, difference):
    result = check(example(total, rows))
    assert result["status"] == "review_needed"
    assert result["checks"][0]["difference"] == difference
    assert result["checks"][0]["sources"][0]["page"] == 1


@pytest.mark.parametrize(
    "changes",
    [
        {"same_scope": "different"},
        {"same_scope": "uncertain"},
        {"scope_evidence": "unclear"},
        {"distribution_complete": False},
        {"currency": "other"},
        {"payments": []},
        {"reported_total": amount(None)},
    ],
)
def test_missing_or_unrelated_evidence_is_not_a_contradiction(changes):
    data = example()
    data["payment_reconciliations"][0].update(changes)
    result = check(data)
    assert result["status"] == "not_checked"
    assert result["checks"][0]["difference"] is None


def test_unreadable_duplicate_or_unsupported_source_rows_skip_check():
    original = example()
    for mutate in [
        lambda g: g["payments"][0].update(amount=amount(None)),
        lambda g: g["payments"][1].update(row_reference="row0"),
        lambda g: g["payments"][0]["amount"].update(
            evidence="PAYMENT DISTRIBUTION 99.99"
        ),
    ]:
        data = deepcopy(original)
        mutate(data["payment_reconciliations"][0])
        assert check(data)["status"] == "not_checked"


def test_unrelated_billed_covered_patient_amounts_do_not_enter_payment_sum():
    data = example()
    data["fields"]["patient_responsibility"] = amount(
        "9999.99", "PATIENT RESPONSIBILITY"
    )
    data["fields"]["billed_total"] = amount("12000.00", "CHARGE AMOUNT")
    assert check(data)["checks"][0]["status"] == "match"


def test_multiple_claims_are_checked_separately_not_aggregated():
    data = example("20.00", ("20.00",))
    other = example("80.00", ("90.00",))["payment_reconciliations"][0]
    other["scope_label"] = "Claim 2"
    data["payment_reconciliations"].append(other)
    result = check(data)
    assert [c["status"] for c in result["checks"]] == ["match", "mismatch"]
    assert result["checks"][1]["difference"] == "10.00"


def test_no_sections_or_educational_document_never_get_a_clean_bill_status():
    data = example()
    data["type"] = "educational_example"
    assert check(data)["status"] == "not_checked"
    data["type"] = "eob"
    data["payment_reconciliations"] = []
    assert check(data)["status"] == "not_checked"


def test_reconciliation_source_page_is_validated():
    data = example()
    data["payment_reconciliations"][0]["payments"][0]["amount"]["page"] = 99
    with pytest.raises(ValueError, match="source page"):
        finish_extraction(Extraction.model_validate(data), 2)


def test_local_validation_still_limits_rows_and_forbids_identifiers_in_scope_reason():
    data = example(rows=("1.00",) * 17)
    with pytest.raises(ValidationError):
        Extraction.model_validate(data)
    data = example()
    data["payment_reconciliations"][0]["scope_evidence"] = "Claim: private-id"
    with pytest.raises(ValidationError):
        Extraction.model_validate(data)
