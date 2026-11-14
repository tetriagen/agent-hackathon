# ClearBill: working scaffold

Plain browser UI + FastAPI. The original Streamlit app and agent remain available.
This version deliberately needs no API key and makes no remote AI calls. Local Tesseract OCR recognizes English scans.

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
- `billing/api.py`: health/review endpoints and same-origin static assets.
- `tests/test_billing.py`: money boundaries, missing facts, API validation/privacy.
- `tests/billing-client.test.mjs`: local extraction helpers and export content.

The browser sends only six allowlisted fields: estimate amount, bill amount,
payment type, same-provider answer, estimate-received answer, and 120-day-window
answer. Files, filenames, document text, names, addresses, dates and account IDs
are not included. Preview the exact JSON before submitting; unknown server fields
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
- EOB and teaching-example documents are blocked from the self-pay comparison.
- Editable, user-confirmed facts; changes invalidate stale results and confirmation.
- Exact money comparison and preliminary self-pay routing.
- Unknown, below-threshold, outside-scope and review-recommended outcomes.
- Local TXT letter download and browser print / Save as PDF.
- Errors, disabled controls while busy, request timeout and case reset.

## Not implemented yet

Standalone image uploads; semantic AI extraction; service-line matching; automated PII
redaction for sending free text; complete legal eligibility checks; saved cases;
appeals submission; payments; insurance coverage or EOB correctness analysis; Medicare lookup.
No legal finding or savings amount is inferred. The $400 screen does not validate
all requirements (including estimate timing, service dates, and comparability).
The exported letter requests an itemized explanation rather than asserting a violation.

## Next implementation slice

1. Expand supported labels/layouts with representative tests; improve OCR table handling.
2. Keep user confirmation before applying rules; add service-line matching.
3. If adding remote AI, first implement and test local redaction and a new explicit
   data-sharing boundary. Never route raw uploads through the legacy agent loop.
4. Add case export/import and handling of a provider response.
5. Expand rule coverage against reviewed CMS sources; deploy and validate hosting.

Reference used for the preliminary screen:
https://www.cms.gov/initiatives/your-patient-rights/medical-bill-rights/get-help/dispute-bill

The interface is intentionally minimal so it can be redesigned independently of the API.

## Verification of this scaffold

- Python: 48 tests passed, including the original agent tests.
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
