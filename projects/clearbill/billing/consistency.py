"""Deterministic checks of explicitly related, AI-extracted payment sections.

A finding is a discrepancy to verify, not proof of a billing error or savings.
No medical, coverage, or legal conclusions are made here.
"""

import re
from decimal import Decimal

MONEY = re.compile(r"(?<![\d.,-])(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2}(?![\d.,])")


def source_supports(amount):
    """Check the quoted number, not just a model's claimed numeric value."""
    return amount.value is not None and any(
        Decimal(match.group().replace(",", "")) == Decimal(amount.value)
        for match in MONEY.finditer(amount.evidence)
    )


def check_payments(extraction):
    checks = []
    limitation = (
        "Checks use AI-extracted labels and scope. Verify both sections in the original PDF. "
        "A mismatch is not proof of an incorrect bill, money owed, or potential savings."
    )
    if extraction.type != "eob":
        return {
            "status": "not_checked",
            "checks": [],
            "summary": "Payment reconciliation currently supports EOB documents only.",
            "limitation": limitation,
        }
    for group in extraction.payment_reconciliations:
        sources = [
            {"label": "Reported total payment", **group.reported_total.model_dump()}
        ]
        sources.extend(
            {
                "label": f"Payment distribution — {entry.row_reference}",
                **entry.amount.model_dump(),
            }
            for entry in group.payments
        )
        check = {
            "rule": "payment_total_vs_distribution",
            "scope": group.scope_label,
            "scope_evidence": group.scope_evidence,
            "status": "not_checked",
            "reported_total": group.reported_total.value,
            "distribution_total": None,
            "difference": None,
            "sources": sources,
        }
        reason = None
        if group.same_scope != "confirmed" or group.scope_evidence == "unclear":
            reason = (
                "The sections could not be confirmed as the same claim/payment period."
            )
        elif group.currency != "USD":
            reason = "The sections do not have a confirmed common USD currency."
        elif not group.distribution_complete or not group.payments:
            reason = "The payment distribution is missing or incomplete."
        elif len({p.row_reference.strip().casefold() for p in group.payments}) != len(
            group.payments
        ):
            reason = "Distribution rows have duplicate references; check for repeated extraction."
        elif not all(
            source_supports(a)
            for a in [group.reported_total, *(p.amount for p in group.payments)]
        ):
            reason = "An amount is missing or its source excerpt does not contain the extracted number."
        if reason:
            check["explanation"] = reason
        else:
            total = sum((Decimal(p.amount.value) for p in group.payments), Decimal(0))
            difference = total - Decimal(group.reported_total.value)
            check.update(
                distribution_total=f"{total:.2f}",
                difference=f"{difference:.2f}",
                status="mismatch" if difference else "match",
            )
            check["explanation"] = (
                "The printed total payment differs from the sum of payment-distribution rows. Ask the issuer to explain which section is correct."
                if difference
                else "The extracted total payment equals the sum of the extracted distribution rows. This verifies only this comparison."
            )
        checks.append(check)
    mismatches = sum(c["status"] == "mismatch" for c in checks)
    compared = sum(c["status"] != "not_checked" for c in checks)
    status = "review_needed" if mismatches else "checked" if compared else "not_checked"
    summary = f"Discrepancies: {mismatches}. Comparisons completed: {compared}. Skipped: {len(checks) - compared}."
    if not checks:
        summary = "No comparable total-payment and payment-distribution sections were extracted. This does not mean the document is correct."
    return {
        "status": status,
        "checks": checks,
        "summary": summary,
        "limitation": limitation,
    }
