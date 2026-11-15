# Duplicate-service backend audit — 15 November 2026

The server now flags **possible** duplicate service groups and creates one letter
covering those groups and any payment discrepancies. It sends no messages and
makes no extra AI call to write the letter. UI files are unchanged for the user's
separate frontend chat; the integration contract is [FRONTEND-API.md](FRONTEND-API.md).

## Implemented scope

Within one AI-extracted patient/provider/claim group, match original service rows
with the same single service date, code, modifiers, quantity, line charge and
shown time/site/specimen/encounter context. Compare at most 12 extracted rows.
Unknown fields, non-USD data, invalid dates, date ranges, nonpositive amounts,
summaries, adjustments, repeated copies and duplicate source positions are skipped.
Source transcriptions must contain the date, code, charge, labeled quantity and
any shown modifiers/context. This checks the model's evidence for consistency;
it does not independently prove that the transcription matches the PDF.

Repeat/distinct-service modifiers 59/76/77/91/XE/XP/XS/XU conservatively exclude
rows from this screen. Modifier handling is not a full coding policy or coverage
decision. [CMS's repeat-service guidance](https://www.cms.gov/medicare-coverage-database/view/article.aspx?articleId=53482)
explains why identical services can be legitimate and why modifiers matter; this
Medicare guidance is not treated as a universal commercial-insurance rule.

## Findings corrected during the audit

1. **Model judged repeats instead of extracting facts.** Early live tests missed
   the duplicate because “separately listed charge” was interpreted as a separate
   clinical service. Removed that model judgment from the schema. The model now
   extracts printed time/site/specimen/encounter details; deterministic code compares them.
2. **Invented or unsupported quantities.** No implicit quantity of 1. Missing or
   unreadable units skip the row; an extracted number needs labeled quantity evidence.
3. **Same printed row extracted twice.** Duplicate `(page,row)` positions are
   excluded rather than treated as two charges. Three equal original rows form
   one finding, not three overlapping pairwise findings.
4. **False equality from dates/modifiers/context.** Different scopes, dates,
   times, codes, quantities, charges and modifiers do not match. Date ranges and
   invalid calendar dates skip comparison. “none” modifiers normalize to an empty
   list; arbitrary modifier prose is rejected.
5. **Blank payee omitted in payment distribution.** In the five-PDF regression,
   Gemini omitted HealthComp's blank EMP row and reported matching extracted
   totals. Strengthened the blank-row instruction. A targeted live recheck kept
   the null row; server logic correctly skipped the incomplete comparison even
   though the model still claimed distribution completeness.
6. **Name returned as a null amount's evidence.** The HealthComp recheck returned
   the synthetic payee name for a missing amount. The validator now clears all
   null-amount evidence and page fields. This is not general PII redaction; the
   original PDF is still sent under explicit consent and other model text needs review.
7. **Wrong recipient or incomplete letter.** EOB letters address the insurer;
   provider bills address the billing department. The new server letter combines
   service and payment findings, uses validated fields, and excludes free-form
   model instructions/source prose. No refund or savings is asserted.

## Verification

- **119 Python tests passed**, including an API integration test verifying one
  extraction call returns findings plus the combined letter; no second model call.
- **12 existing JavaScript tests passed.** No frontend source files were changed.
- Ruff checks/format checks and Git whitespace checks passed for the changed code.
- Three synthetic PDFs were rendered and inspected, then processed with live
  `gemini-3.5-flash-lite`: two matching $75 rows → one possible-duplicate group
  and letter; repeat modifier 76 → skip, no letter; missing quantity → skip, no letter.
- Five previous public PDFs were processed live: all 9 populated reference
  amounts and 11 null fields remained correct; document types 5/5. Jane Jones's
  $43.06 versus $53.83 payment discrepancy and its letter remain present.
- The original public PDFs do not provide a positive duplicate-service case.
  Their service rows lacked sufficient comparable data, so **zero service rows
  qualified for duplicate matching**. This is abstention, not proof that those
  documents contain no duplicates.
- HealthComp's omission was found manually and retested as described above.
  All nine validation responses were then replayed through final local validators,
  including null-source cleanup. Captured output was not silently hand-corrected.

Validation responses used **27,474 input + 4,597 output = 32,071 tokens** and
22.93 seconds in aggregate adapter timing. Four earlier setup calls are excluded
from these totals: one initial probe and a three-case run exposed the faulty
model repeat judgment. No automatic retries, larger model, or raised 2500-token
output limit were introduced. Full validation data is in
[DUPLICATE-AUDIT-RESULTS.json](DUPLICATE-AUDIT-RESULTS.json).

## Remaining limitations

- This is a bounded prototype screen, not a complete billing/clinical/legal audit.
  It misses description-only services, different charges, missing quantities,
  duplicates across claims, and rows beyond the extraction limit.
- AI may omit rows, misread dates/codes, merge scopes or fail to mark repeated
  copies. Blue Cross's response grouped its three claims under one anonymous
  scope; missing quantities prevented those rows from entering matching. Scope
  remains an AI assertion, not independent identity verification.
- `no_candidates` is not a clean bill of health. `coverage` and skipped reasons
  must be visible. Even `complete` relies on the model's extraction-completeness
  assertion; source review remains necessary.
- The two matching synthetic charges could still be legitimate repeated care.
  The product asks the insurer/provider to explain them; it does not decide this.
- Live validation is Gemini-only. The OpenAI adapter's request/response boundary
  is tested with doubles; no paid OpenAI result was obtained.
- The new findings/combined letter are available in the API. The existing UI
  still uses its older payment-only letter until the frontend chat integrates them.
- Production hosting, durable rate limits, redaction and sensitive-document
  processing have not been certified by this change.
