# Standalone ClearBill portfolio copy

This is a self-contained snapshot of ClearBill from repository commit
5898ad337324e1922a29a3f8ef0f50d48e552be7. Read README.md for current commands and
CASE-STUDY.md for portfolio claims. Historical docs describe earlier development.

Run all commands from this folder. Use its own .venv and requirements.txt with uv;
reuse an existing environment. Install browser assets with npm ci. Run with
`.venv/bin/python -m uvicorn billing.api:app --host 127.0.0.1 --port 8000 --no-access-log`.
Tests: `.venv/bin/python -m pytest -q` and `npm run test:client`.

The root application's billing/ and web/ are the existing deployment source.
This copy has no runtime dependency on them; changes are not synchronized.
Do not change the existing Render service just to edit this portfolio copy.
Never route documents through the legacy agent. Preserve consent boundaries,
manual verification and conservative findings. Do not imply verified savings,
medical/legal certification or actual paying clients.

Use Ruff check and format --check after Python edits. Before commits and pushes,
run the repository's Gitleaks checks with redaction enabled. Keep .env, logs/,
data/*.db, dependencies, caches and real patient documents out of Git.
Before UI changes read DESIGN.md; use the bundled .agents/skills review and
Playwright instructions and check desktop/mobile layouts and console errors.
