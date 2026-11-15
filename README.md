# ClearBill — ANEsolves

**Understand your medical bill, verify questionable charges, and prepare a clarification letter.**

[Open ClearBill](https://clearbill-5ay0.onrender.com) · [Review a document](https://clearbill-5ay0.onrender.com/review.html)

ClearBill is a browser-based hackathon MVP for working adults in the United States. It helps users review medical bills and Explanation of Benefits (EOB) documents. The interface is in English and requires no account.

## How it works

1. **Read documents.** Upload your bill or EOB as a PDF or text file. An estimate is optional and is used for the separate self-pay comparison. The browser reads the document locally and displays recognized amounts. Scanned English PDFs can use local OCR.
2. **Verify findings.** With your explicit consent, the selected original PDF is sent to the configured model for structured extraction. Server-side rules compare payment totals and matching service rows. Every candidate includes source details for checking against the original document.
3. **Prepare a letter.** Confirm the findings to open an editable clarification letter. Copy it or download a TXT file, replace the bracketed personal details, and send it yourself. ClearBill never sends a message to the insurer automatically.

The landing page explains the product; **Check your bill** opens the separate review workspace. Findings and letters are separate steps, and self-pay comparison has its own tab.

## What the MVP checks

- **Payment inconsistencies:** compares an extracted payment total with the sum of a complete, comparable payment-distribution section.
- **Possible duplicate services:** matches distinct rows within the same extracted patient/provider/claim scope using service date, code, modifiers, units, charge and shown service context.
- **Self-pay comparison:** compares user-confirmed bill and estimate amounts with preliminary screening questions. It does not determine legal eligibility.
- **Clarification letters:** builds a draft from supported findings using deterministic templates, without an additional model request.

A repeated row can represent a legitimate service. A discrepancy is a reason to ask a question, not proof of an incorrect bill, a refund, or savings. An EOB explains an insurance claim; it is not itself a provider bill.

## Verified demo

Use [the synthetic duplicate-service PDF](tests/fixtures/duplicates/duplicate.pdf). It contains two separately listed services dated October 20, 2026, code `97110`, one unit and **$75 per row**. Totals are **$150 billed**, **$100 paid by the plan**, and **$50 patient responsibility**.

On November 15, 2026, the public deployment was checked through the complete browser flow with a real Gemini response: upload → local reading → consent → review → possible duplicate finding → confirmation → editable letter → successful TXT download. The $75 amount is a row charge, not a demonstrated saving. This single synthetic case does not establish accuracy across all medical documents.

## Privacy and limits

- Local PDF/text reading and OCR run in the browser. Merely selecting a file does not send the original PDF to the model.
- Remote review requires consent and a separate button click. It sends the **original, unredacted PDF** through the backend to the provider named in the consent notice. Editing the local text does not redact the PDF.
- Model credentials stay on the server. Do not put keys in frontend code or commit `.env`.
- The review flow does not save cases to a database or browser storage. Reloading loses the current case and letter edits. Infrastructure and provider processing still apply; this is not a zero-knowledge or HIPAA-compliance claim.
- The Gemini free-tier notice is shown beside consent. Use public samples or synthetic documents for the demo.
- Files: up to **10 MB / 30 PDF pages**. Local OCR: up to **5 scanned pages**, English. Exact duplicate checks consider up to **12 extracted original service rows**.
- Missing evidence is reported as insufficient coverage. No findings does not mean the bill is correct.
- The demo defaults to **20 remote requests per server process**, with one remote request at a time. Restarting resets that process-local counter.
- Render's free instance may sleep after inactivity; the first visit can take longer.

## Run locally

Requirements: **Python 3.12**, **Node.js 22.13+**, and npm.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
npm ci
cp .env.example .env
python -m uvicorn billing.api:app --host 127.0.0.1 --port 8000 --no-access-log
```

On Windows, activate with `.venv\Scripts\activate`. Open `http://127.0.0.1:8000`.

Local reading and rule-based self-pay comparison need no API key. For optional remote PDF review, set these values in the ignored `.env` file or the server environment:

```dotenv
AI_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
CLEARBILL_AI_MAX_REQUESTS=20
```

The model above was used for the verified demo; availability depends on your provider project. OpenAI is also supported through `AI_PROVIDER=openai`, `OPENAI_API_KEY`, and `OPENAI_MODEL`. Environment variables take precedence over `.env`. There is no automatic fallback to a larger model.

## Deployment

The public site runs the FastAPI application and static frontend together on Render. The deployment branch is **`anesolves/clearbill`**.

- Runtime: Docker
- Dockerfile: `Dockerfile.clearbill`
- Build context: repository root
- Listen address: `0.0.0.0:8000`
- Health check: `/api/health`
- Set credentials as server environment secrets, never in the repository.

```bash
docker build -f Dockerfile.clearbill -t clearbill .
docker run --rm -p 8000:8000 --env-file .env clearbill
```

The container includes locally served PDF and OCR assets. It does not copy `.env` into the image.

## Project structure

```text
web/                       Landing, review steps, animations, local PDF/OCR reading
billing/api.py             FastAPI endpoints and static asset serving
billing/extraction.py      Gemini/OpenAI structured extraction
billing/consistency.py     Payment reconciliation rules
billing/duplicates.py      Exact service-row matching
billing/letters.py         Combined clarification letters
billing/rules.py           Confirmed-fact self-pay screening
billing/models.py          Request/response validation
tests/                    Rule, extraction, API and browser-helper tests
Dockerfile.clearbill       Product deployment container
```

## Checks and technical documentation

```bash
.venv/bin/python -m pytest -q tests/test_billing.py tests/test_consistency.py tests/test_duplicates.py tests/test_extraction.py
npm run test:client
```

Automated tests use mocked provider responses; the real production demo above was checked separately.

- [Product architecture and boundaries](docs/CLEARBILL.md)
- [Frontend/API contract](docs/FRONTEND-API.md)
- [PDF extraction comparison](docs/GEMINI-COMPARISON.md)
- [Payment-check results](docs/CONSISTENCY-RESULTS.md)
- [Duplicate-check limitations](docs/DUPLICATE-AUDIT.md)

## Scope and team

Built by **ANEsolves** for the hackathon. No checkout, subscriptions, login, saved-case history, automatic appeals, or insurer submission is implemented. Pricing discussed in the pitch is a hypothesis, not an available paid plan.

The original Streamlit business-agent starter remains in `app.py`, `agent/`, `tools/`, and the original `Dockerfile`. It is separate from ClearBill and is not used by the public medical-bill review flow.
