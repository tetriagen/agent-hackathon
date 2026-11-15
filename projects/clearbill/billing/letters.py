"""Evidence-based drafts from server findings. No AI call or external action."""


def draft_review_letter(document_type, consistency, duplicates):
    payments = [c for c in consistency["checks"] if c["status"] == "mismatch"]
    services = duplicates["findings"]
    if not payments and not services:
        return None
    insurer = document_type == "eob"
    recipient = "insurance_claims" if insurer else "provider_billing"
    recipient_label = (
        "Insurance company / claims department"
        if insurer
        else "Provider / billing department"
    )
    document = "Explanation of Benefits (EOB)" if insurer else "itemized medical bill"
    sections = []
    for index, check in enumerate(payments, 1):
        rows = "\n".join(
            f"  - Distribution row {i}: ${s['value']} (PDF page {s['page']})"
            for i, s in enumerate(check["sources"][1:], 1)
        )
        sections.append(
            f"Payment comparison {index}:\n- Reported total payment: ${check['reported_total']} (PDF page {check['sources'][0]['page']})\n{rows}\n- Distribution sum: ${check['distribution_total']}\n- Difference (distribution minus reported total): ${check['difference']}"
        )
    for index, finding in enumerate(services, 1):
        locations = "; ".join(
            f"PDF page {s['page']}, service row {s['row']}" for s in finding["sources"]
        )
        sections.append(
            f"Possible repeated service group {index}:\n- Service date: {finding['service_date']}\n- Service code: {finding['code']}\n- Modifiers: {', '.join(finding['modifiers']) or 'none shown'}\n- Quantity per row: {finding['units']}\n- Charge per row: ${finding['charge_per_row']}\n- Rows to review: {locations}\nThese rows appear to have matching service details. Please confirm whether each represents a separately provided service and explain any differences in encounter, time, site, specimen, quantity or coding. If a charge was duplicated, please correct it and explain any effect on my responsibility."
        )
    subject = (
        "Request to review payment figures and possibly repeated services"
        if payments and services
        else "Request to clarify possibly repeated service charges"
        if services
        else "Request to clarify inconsistent payment figures"
    )
    questions = (
        "Please confirm whether the payment sections refer to the same claim and payment, explain which amount is correct, and provide a corrected document if needed.\n\n"
        if payments
        else ""
    )
    body = (
        f"To: [{recipient_label}]\nFrom: [Your name]\nMember/account ID: [Your member or account ID]\nClaim/reference(s): [Reference for each group below]\nDate: [Today's date]\n\nSubject: {subject}\n\nDear {'Claims' if insurer else 'Billing'} Department,\n\nI am requesting a review of the following items in my {document}:\n\n"
        + "\n\n".join(sections)
        + f"\n\n{questions}I am asking for clarification, not assuming these items are billing errors or that a refund is due. I can provide the document and referenced pages. Please provide a written explanation, any corrected document, a reference number for this inquiry, and the next steps.\n\nThank you,\n[Your name]\n[Preferred contact details]\n"
    )
    return {
        "recipient": recipient,
        "subject": subject,
        "body": body,
        "requires_review": True,
        "sent": False,
    }
