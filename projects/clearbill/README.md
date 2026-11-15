# ClearBill — standalone portfolio project

**A web application for reviewing medical bills and preparing clarification letters.**

[Live demo](https://clearbill-5ay0.onrender.com) · [Review workspace](https://clearbill-5ay0.onrender.com/review.html) · [Portfolio case study](CASE-STUDY.md) · [All projects](../README.md)

Built by ANEsolves for a hackathon. This folder preserves the completed project from commit `5898ad337324e1922a29a3f8ef0f50d48e552be7`. Application code, browser assets and product tests are copied without changing their behavior. It can be copied into its own repository and run independently; only the link to the parent portfolio would need removal.

## What is included

- Responsive landing page and a separate, step-by-step review workspace.
- Local PDF/text reading and English OCR of scanned PDFs.
- Optional, explicitly consented original-PDF extraction using Gemini or OpenAI.
- Deterministic checks for payment inconsistencies and possible exact duplicate service rows.
- Editable clarification letters, clipboard copying and TXT export.
- Product tests, synthetic PDF examples, technical documentation and a Docker deployment definition.

The original Streamlit agent is not part of this standalone folder. The current public deployment still uses the application at the repository root. Editing this portfolio copy alone does not update that deployment.

## Run from this folder

Requires Python 3.12, Node.js 22.13+ and npm. From the repository root:

```bash
cd projects/clearbill
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -r requirements.txt
npm ci
cp .env.example .env
.venv/bin/python -m uvicorn billing.api:app --host 127.0.0.1 --port 8000 --no-access-log
```

Reuse `.venv` if it already exists. Open `http://127.0.0.1:8000`. On Windows use `.venv\Scripts\python` for the Python commands and copy the example environment file using your shell.

Local reading, the synthetic example and confirmed-fact self-pay comparison need no API key. Optional remote PDF review requires credentials and an available model configured in this folder's ignored `.env`. Provider access, quotas and charges depend on the provider account. The example contains no credentials, and no paid provider call is required for automated tests.

## Test

Run these commands **inside this folder**, so imports resolve to this copy:

```bash
.venv/bin/python -m pytest -q
npm run test:client
```

Both the repository root and this folder have a `pytest.ini` that selects their own `tests/` directory. This prevents ordinary root-level test runs from collecting both applications under the same module names.

Snapshot verification on November 15, 2026: 97 product Python tests and 12 JavaScript tests passed. Ruff lint and format checks passed for the copied Python files. An in-process HTTP check served all 19 frontend files plus the page entry points, health endpoint and PDF/OCR dependency assets (28 requests). It confirmed the app loaded from this folder and did not expose `.env`. Python checks reused the existing repository environment; npm dependencies were installed in this folder with `npm ci --ignore-scripts`. No remote AI request was made. The root application's 119 Python tests also passed. Docker was unavailable, so the copied Dockerfile was not built again.

For a manual demo, upload [duplicate.pdf](tests/fixtures/duplicates/duplicate.pdf). Remote review can identify two separately listed matching service rows, depending on model extraction; confirm the finding to prepare a letter. Also included: [repeat encounter](tests/fixtures/duplicates/repeat.pdf) and [missing quantities](tests/fixtures/duplicates/incomplete.pdf). These are synthetic documents.

## Deploy this copy independently

From `projects/clearbill/`:

```bash
docker build -f Dockerfile.clearbill -t clearbill-portfolio .
docker run --rm -p 8000:8000 --env-file .env clearbill-portfolio
```

For a **new** Render Docker service using this repository, set Root Directory to `projects/clearbill`, Dockerfile Path to `Dockerfile.clearbill`, and Docker Build Context Directory to `.` (relative to that root). Use `/api/health` as the health check. Add provider credentials as server-side environment secrets. The app listens on port 8000. The existing Render service has not been reconfigured.

## Structure

```text
web/                   HTML, CSS, JavaScript, motion and local PDF/OCR helpers
billing/               FastAPI, extraction adapters and deterministic checks
tests/                 Product tests and synthetic examples
docs/                  Architecture, API contract and historical verification
.agents/               Vendored interface-review and browser-tool instructions
Dockerfile.clearbill   Independent container build using this folder as context
CASE-STUDY.md          Client-facing portfolio description
```

## Limits and provenance

This is a hackathon MVP, not a certified billing audit. Findings need manual verification and do not establish an overcharge, savings or a right to a refund. Optional AI review sends the original, unredacted PDF to the disclosed provider only after consent. Use synthetic/public documents for demonstrations. Cases are not saved; reloading loses the current work. No accounts, payments or automatic insurer submission are implemented.

[The original product README](docs/HACKATHON-README.md) and the other technical reports in `docs/` preserve development history, including older UI labels and past test results. Their repository-relative paths refer to the original root application; use the commands and local sample links above for this standalone copy. Historical validation reports are not a new validation of every copied configuration.
