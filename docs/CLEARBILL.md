# ClearBill: working scaffold

Plain browser UI + FastAPI. The original Streamlit app and agent remain available.
Local mode needs no API key and makes no remote AI calls. Local Tesseract OCR
recognizes English scans. Optional AI mode sends the original selected PDF to
the configured provider only after explicit consent and a separate button click.

## Run

From the repository directory, using Python 3.12 and Node 22.13+:

```bash
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -r requirements.txt
npm ci
.venv/bin/python -m uvicorn billing.api:app --host 127.0.0.1 --port 8000 --no-access-log
```

Open http://127.0.0.1:8000. Click **Load synthetic example**, confirm the facts,
then **Compare amounts**. The example uses the exact same API and rules as manual
inputs. Change an amount to verify that the result changes. No login is needed.
PDF reading uses pdfjs-dist; scanned pages use Tesseract.js with a bundled English
model. All assets are served from this app, without a CDN. Install them with npm ci.

Windows: use `.venv\Scripts\python` for the Python commands.

```bash
.venv/bin/python -m pytest
node tests/billing-client.test.mjs
ruff check billing tests/test_billing.py
ruff format --check billing tests/test_billing.py
```

Optional deployment container (Docker build is separate from the tested local run):

```bash
docker build -f Dockerfile.clearbill -t clearbill .
docker run --rm -p 8000:8000 clearbill
```

## Boundaries

- `web/app.js`: local PDF/TXT ingestion, explicit confirmation, API client, exports.
- `web/core.mjs`: answer conversion and draft letter assembly.
- `web/ingestion.mjs`: local PDF text extraction and OCR, with size/page limits.
- `web/document-parser.mjs`: document classification and labeled amount extraction.
- `billing/models.py`: strict schema, USD decimal strings, unknown answers allowed.
- `billing/rules.py`: Decimal arithmetic and preliminary screening, no LLM verdict.
- `billing/consistency.py`: deterministic reconciliation of related EOB payment sections.
- `billing/api.py`: health/review endpoints and same-origin static assets.
- `tests/test_billing.py`: money boundaries, missing facts, API validation/privacy.
- `tests/billing-client.test.mjs`: local extraction helpers and export content.

The amount-comparison endpoint `/api/review` sends only six allowlisted fields: estimate amount, bill amount,
payment type, same-provider answer, estimate-received answer, and 120-day-window
answer. Files, filenames, document text, names, addresses, dates and account IDs
are not included in that endpoint. Preview the exact JSON before submitting; unknown server fields
are rejected. No database, body logging, analytics, localStorage or sessionStorage
is used. UI state is lost on reload. The existing agent audit logger is not called.
Infrastructure logs, browser extensions, device security and production hosting
still need review before real use; this is not a HIPAA compliance or zero-knowledge claim.

## What is functional

- PDF/TXT reading in the browser, limits of 10 MB / 30 pages / 100k characters.
- Local English OCR for up to 5 scanned pages, with manual digit verification.
- EOB / estimate / bill / teaching-example classification using explicit keywords.
- Labeled totals with source excerpts; missing or conflicting amounts stay unresolved.
- EOB billed charges, plan payment and patient responsibility remain separate.
- Optional AI-assisted EOB payment reconciliation: printed total payment versus
  the sum of complete distribution rows, with source pages and skipped-check reasons.
- EOB and teaching-example documents are blocked from the self-pay comparison.
- Editable, user-confirmed facts; changes invalidate stale results and confirmation.
- Exact money comparison and preliminary self-pay routing.
- Unknown, below-threshold, outside-scope and review-recommended outcomes.
- Local TXT letter download and browser print / Save as PDF.
- Errors, disabled controls while busy, request timeout and case reset.

## Not implemented yet

Standalone image uploads; service-line matching; automated PII
redaction for sending free text; complete legal eligibility checks; saved cases;
appeals submission; payments; insurance coverage or comprehensive EOB correctness analysis; Medicare lookup.
No legal finding or savings amount is inferred. The $400 screen does not validate
all requirements (including estimate timing, service dates, and comparability).
The exported letter requests an itemized explanation rather than asserting a violation.

## Next implementation slice

1. Expand supported labels/layouts with representative tests; improve OCR table handling.
2. Keep user confirmation before applying rules; add service-line matching.
3. Before processing sensitive real documents with AI, implement local redaction
   and validate its limits. The current optional mode explicitly sends the original
   unredacted PDF; never route uploads through the legacy agent loop.
4. Add case export/import and handling of a provider response.
5. Expand rule coverage against reviewed CMS sources; deploy and validate hosting.

Reference used for the preliminary screen:
https://www.cms.gov/initiatives/your-patient-rights/medical-bill-rights/get-help/dispute-bill

The interface is intentionally minimal so it can be redesigned independently of the API.

## Verification of this scaffold

- Python: 74 tests passed, including the original agent tests, AI boundaries and payment reconciliation.
- JavaScript: 8 parser/export tests passed.
- Ruff check and format check passed for changed Python code.
- Chromium: synthetic example, changed amounts, missing answers, network failure,
  recovery controls, TXT download and case reset checked.
- Actual synthetic PDF and TXT uploads parsed locally; no POST occurred on upload
  and the document-text sentinel was absent from the analysis request.
- Invalid PDF cleared the previous result and amount.
- Desktop 1440px and mobile 390px layouts inspected; no horizontal page overflow.
- Five public PDFs were run through Chromium, including the 3-page scanned Jane Jones EOB.
  No remote requests or document-upload POSTs occurred during ingestion.
- EOB rejection and invalid-PDF stale-state clearing verified in Chromium.
- Production deployment and Docker build have not been verified.
- See [PDF test results](PDF-TEST-RESULTS.json) for extracted amounts and limitations.


## Optional Gemini or OpenAI extraction

Use `AI_PROVIDER=gemini` and `GEMINI_API_KEY` to select Gemini. The default Gemini
model is `gemini-3.5-flash-lite`; override with `GEMINI_MODEL`. The local demo is
configured this way. Requests cap output at 2500 tokens and use the model's default
minimal thinking. No automatic retries or fallback to a larger model/provider.

Alternatively use `AI_PROVIDER=openai`, `OPENAI_API_KEY` and `OPENAI_MODEL`
(default `gpt-4.1-mini`). If AI_PROVIDER is omitted the legacy default is OpenAI.
`CLEARBILL_AI_MAX_REQUESTS` defaults to 20. Environment variables override the local
ignored `.env`. Keys never go to the browser. In Docker, pass environment variables;
the image does not copy `.env`.

Select a PDF, check the separate data-sharing consent, and click **Compare with AI**.
This sends the **original unredacted PDF**, including images and any personal data,
to `/api/extract` and then the provider named in the consent label. The server
rejects consent for a different provider, requiring a reload and renewed consent. Editing the local text does not redact the PDF.
The new boundary is deliberately visible; this is not zero-knowledge processing.

Both adapters return a structured extraction with four nullable amounts,
source excerpts, PDF pages, document type, warnings and related payment-section rows.
Server Decimal arithmetic compares the printed total payment with distribution
rows only when scope, currency, complete amounts and source excerpts permit it.
Unrelated claims are kept separate; missing/blank values are never treated as zero.
The number-in-excerpt check does not prove that the model quoted the PDF accurately
or interpreted headings correctly. Original pages still need review.
AI values do not overwrite
confirmed facts or make legal decisions. Excerpts and figures still need visual
verification. For OpenAI, response storage is disabled with `store=False`; that is not a
promise of zero provider retention. Both adapters send inline PDFs and create no
Files API objects. Gemini Free Tier content may be used to improve Google products;
use public samples or synthetic data for this demo.

The server accepts PDFs up to 10 MB and 30 pages, rejects encrypted PDFs, runs one
AI call at a time, disables automatic SDK retries and uses a 110-second timeout.
The per-process attempt cap is bounded at 100 and resets on restart. It is a demo
limit, not a durable production billing control; multiple workers have separate
counters. A public deployment needs durable rate/cost limits.

On 2026-11-14 the OpenAI live request was blocked by HTTP 429
`credit_balance_exhausted` / `insufficient_quota`. The first PDF was attempted twice
(the second call identified the precise provider code). No model output was
obtained; the other four were not sent. No OpenAI accuracy score is available. Gemini results are recorded separately below.
UI success was checked using an explicitly mocked response, not a live AI result;
consent, original-PDF transfer, non-overwrite of facts, quota error recovery and
390/1440px layouts were tested. Existing local functionality remains available.

The five-sample expected values are independently recorded in
`tests/fixtures/pdf-expected.json`. To run the comparison with the configured provider:

```bash
.venv/bin/python -m billing.compare_samples /path/to/billing-examples /path/to/comparison.json
```

This command intentionally consumes API quota (and may incur charges on a paid tier) for five public samples and stops on
the first failed request. Local rules read PDF.js/OCR text; AI reads original
PDFs. Results compare complete pipelines, not identical text inputs. Check source
excerpts, page references and warnings manually in addition to numeric scores.

Official API references:
- https://developers.openai.com/api/docs/guides/file-inputs
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/guides/chatgpt-api-credits


## Gemini validation

Five live public-PDF results from `gemini-3.5-flash-lite`: all 9 populated reference
amounts matched; local rules found 6 and missed 3. Both classified 5/5 documents
correctly and left 11 non-applicable fields null. Numeric success does not imply
complete verification: the initial extraction-only version missed the Jane Jones payment inconsistency and
Blue Cross multi-claim warning; two excerpts contained only a number.
See [the reviewed comparison](GEMINI-COMPARISON.md) and
[original structured responses](GEMINI-COMPARISON.json).

The updated extraction plus deterministic reconciliation catches the Jane Jones
$43.06 versus $53.83 discrepancy (difference $10.77). HealthComp's blank EMP amount
causes a conservative skip; it is not invented as zero. The other three PDFs have
no applicable payment-distribution comparison. No general billing-accuracy claim
is made from these five samples. See [updated results](CONSISTENCY-RESULTS.md).
The UI shows mismatches, matching extracted totals and checks it could not perform.
Matching one comparison does not certify a document, and differences are not savings.

Gemini receives a simplified schema without string/array length bounds to avoid
decoder-complexity rejection. The same strict Pydantic model still validates all
bounds server-side; output-token limits remain unchanged.

UI: provider disclosure, explicit consent, original PDF payload, unchanged manual
facts, quota-error recovery and 390/1440px layouts checked with mocked responses
and synthetic input, without extra model calls. The five-PDF run used live Gemini.

Gemini API references:
- https://aistudio.google.com/docs/models/gemini-3.5-flash-lite
- https://aistudio.google.com/docs/document-processing?generate-content=true
- https://aistudio.google.com/docs/structured-output?generate-content=true
