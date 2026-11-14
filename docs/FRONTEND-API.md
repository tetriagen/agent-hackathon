# ClearBill API handoff — duplicate services and letters

The backend is in `billing/`. This change intentionally does **not** edit `web/`,
because frontend work is happening in another chat. The current UI continues to
show payment comparisons; wire the new fields below into the replacement UI.

## Existing request stays the same

`POST /api/extract` sends the original PDF bytes, not multipart or a URL:

```http
Content-Type: application/pdf
X-AI-Consent: send-original-pdf
X-AI-Provider: gemini
```

Read the actual provider and availability from `GET /api/health`. Require the
existing separate data-sharing consent. Local text edits do not redact the original
PDF. Do not put API keys in frontend code. Preserve handling of 400/409/413/415/422,
429, 502 and 503. Existing `extraction`, `consistency`, provider, model, usage and
timing fields are retained. The response adds `duplicates` and `review_letter`.

## Duplicate-service result

```json
{
  "duplicates": {
    "status": "review_needed",
    "coverage": "complete",
    "rows_extracted": 2,
    "rows_checked": 2,
    "extraction_complete": true,
    "findings": [{
      "rule": "possible_duplicate_service",
      "status": "possible_duplicate",
      "scope": "case1",
      "service_date": "2026-10-20",
      "code": "97110",
      "modifiers": [],
      "units": "1",
      "charge_per_row": "75.00",
      "service_context": "",
      "sources": [
        {"page": 1, "row": 1, "evidence": "Source transcription"},
        {"page": 1, "row": 2, "evidence": "Source transcription"}
      ],
      "explanation": "Possible repeat to verify, not a proven billing error."
    }],
    "skipped": [],
    "summary": "Possible duplicate groups: 1. Rows eligible for matching: 2.",
    "limitation": "Exact matching of up to 12 extracted rows; verify original pages."
  }
}
```

The example abbreviates explanatory strings; render the actual response strings.
Money and quantities are decimal **strings**. `page` and `row` are 1-based; `row`
is the physical service-row ordinal on the page, not a PDF text line number.
`scope` is an anonymous patient/provider/claim group; do not display it as a real
claim identifier. Source `evidence` is an AI-produced labeled transcription, not
independently verified PDF text.

| Field | Values | UI meaning |
|---|---|---|
| `status` | `review_needed` | Show possible duplicate groups and source rows |
| `status` | `no_candidates` | No exact matches among eligible rows; not an all-clear |
| `status` | `not_checked` | Not enough comparable data, unsupported document, or excluded rows |
| `coverage` | `complete` | All extracted rows were eligible and model reported no omitted rows; not proof the PDF was fully read |
| `coverage` | `partial` | Some rows checked, but skipped or potentially omitted rows remain |
| `coverage` | `not_checked` | No rows eligible for matching |

Always show coverage and skipped reasons. `skipped[]` contains `{page,row,reason}`.
`extraction_complete` is a model assertion about extracted rows and can be true
even when fields within those rows are incomplete; use `coverage`/`rows_checked`
for the comparison status. Do not label matches as confirmed duplicate billing,
refunds, savings or total money owed. `charge_per_row` is not an overpayment.

## One editable letter for all findings

```json
{
  "review_letter": {
    "recipient": "insurance_claims",
    "subject": "Request to clarify possibly repeated service charges",
    "body": "To: [Insurance company / claims department]\n...",
    "requires_review": true,
    "sent": false
  }
}
```

- `review_letter` is **null** when neither supported payment mismatches nor possible
  duplicate groups exist. Do not create a complaint for `no_candidates`/`not_checked`.
- EOB → `insurance_claims`; provider bill → `provider_billing`. Adapt the heading
  to the recipient. Never guess an email address.
- Use `review_letter.body` as the initial value of an editable textarea. It already
  combines payment discrepancies **and** service repeats, keeping separate groups
  separate. Do not keep calling `web/core.mjs:draftInsuranceLetter` as the primary
  generator: that older client function only knows about payment discrepancies.
- `subject` is supplied separately and also included in `body` for TXT exports.
- Copy and download the **edited** value, not the original server body. Let users
  replace the bracketed identity/reference fields and check the PDF before sending.
- There is no send endpoint. Letter creation makes no further AI call; it is a pure
  server template. The existing clipboard fallback and TXT export can be reused.
- Render all source and letter text as text/textarea values, never HTML.
- Clear findings, edited letter and consent when the source document/text changes,
  on reset or on a failed/restarted analysis. Keep requests disabled while busy.
- Avoid showing the old payment-only letter alongside the combined letter.

## Scope and regression safety

Service matching requires the same patient/provider/claim scope, one service date,
code, modifiers, quantity, charged amount, and shown time/site/specimen/encounter
context. Unknown required data, adjustments, summaries, repeated copies, reused
source positions and repeat/distinct-service modifiers are excluded. Descriptions
without service codes and duplicates across separate claims are not supported yet.
The model supplies at most 12 rows; incomplete extraction must remain visible.

`/api/review` still implements the separate confirmed-facts self-pay comparison.
Do not pass EOB charges or a possible duplicated amount into that screen as a bill.
Old browser functionality remains compatible until the new UI is connected.

## Examples for building the UI without API usage

`docs/api-examples/` contains duplicate, repeat, incomplete, combined, and
no-candidates JSON responses. The first three are replayed from live Gemini on
synthetic PDFs; the last two are explicitly synthetic server fixtures.
Use them only in development/tests, not as production analysis results.
Uploadable synthetic documents are in `tests/fixtures/duplicates/`.
See [audit results](DUPLICATE-AUDIT.md) for observed issues and remaining limits.
