"""Preliminary screening, not a legal eligibility determination."""

from decimal import Decimal

from billing.models import ReviewRequest, ReviewResult

SOURCE = "https://www.cms.gov/initiatives/your-patient-rights/medical-bill-rights/get-help/dispute-bill"


def review_bill(facts: ReviewRequest) -> ReviewResult:
    estimate = Decimal(facts.estimate_amount)
    billed = Decimal(facts.billed_amount)
    difference = billed - estimate
    missing = []
    if facts.payment_type == "unknown":
        missing.append("Confirm whether you used insurance for this care.")
    if facts.same_provider is None:
        missing.append("Check that both amounts cover the same provider or facility.")
    if facts.estimate_received is None:
        missing.append("Confirm that you received a written good faith estimate.")
    if facts.within_120_days is None:
        missing.append(
            "Check the date on your initial bill against the 120-day window."
        )

    if (
        facts.payment_type == "insurance"
        or facts.same_provider is False
        or facts.estimate_received is False
    ):
        status = "outside_scope"
        title = "This case needs a different review"
        explanation = "This first version compares self-pay bills with a written estimate for the same provider."
        steps = [
            "Ask the billing office for an itemized explanation.",
            "Check the applicable next steps on CMS.gov.",
        ]
    elif missing:
        status = "needs_information"
        title = "A few facts still need checking"
        explanation = "The amount difference is calculated, but the next step depends on the missing facts."
        steps = missing
    elif facts.within_120_days is False:
        status = "outside_scope"
        title = "Check your options with CMS"
        explanation = "You indicated that the initial bill is outside the usual 120-day window. This app cannot assess extensions."
        steps = [
            "Ask CMS about any available extension or other options.",
            "Request an explanation from your provider.",
        ]
    elif difference >= Decimal(400):
        status = "review_recommended"
        title = "Review the difference with your provider"
        explanation = "The bill is at least $400 above the estimate. Your answers suggest checking the CMS dispute process."
        steps = [
            "Verify that the estimate and bill cover comparable services.",
            "Check all CMS requirements, including estimate timing and service dates.",
            "Download the draft request for an itemized explanation.",
        ]
    else:
        status = "below_threshold"
        title = "The difference is below $400"
        explanation = "This comparison does not meet the $400 amount threshold. It does not establish that the bill is correct."
        steps = ["Review unexpected charges with the billing office."]

    return ReviewResult(
        status=status,
        estimate_amount=f"{estimate:.2f}",
        billed_amount=f"{billed:.2f}",
        difference=f"{difference:.2f}",
        title=title,
        explanation=explanation,
        next_steps=steps,
        source_url=SOURCE,
        limitation="Preliminary comparison of user-confirmed facts. Not a finding of a violation, eligibility decision, or promise of savings.",
    )
