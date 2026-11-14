# Project guidance

This repository includes a Python / Streamlit hackathon starter and a ClearBill
medical-bill scaffold. ClearBill uses `billing/` + `web/`; run with
`python -m uvicorn billing.api:app --port 8000 --no-access-log`.
Read docs/CLEARBILL.md for scope and privacy boundaries. Keep the UI minimal until
the user requests design work. Do not send raw documents through the legacy agent.
Preserve the existing application and agent behavior unless the task requests changes.
Preserve the logic of agent/guard.py unless the user explicitly authorizes changing it.

## Development tools: uv, Ruff, Gitleaks

Use these local tools for development. They must not require paid APIs or new subscriptions.
Check that the tools are available before using them; these rules do not mean they
are already installed. If a tool is missing, report the missing check accurately.

### uv: Python environments and dependencies

- Use the project's .venv and requirements.txt. Reuse an existing environment.
- When creating an environment, use `uv venv --python 3.12 .venv`.
- Install dependencies with `uv pip install --python .venv/bin/python -r requirements.txt`.
- Run Python commands with .venv/bin/python, or activate .venv first.
- Do not install project dependencies into system Python or migrate the project
  to a different packaging format just to use uv.

### Ruff: Python checks and formatting

- After Python edits, run `ruff check` on the changed first-party Python files.
- Run `ruff format --check` on those files; format only files within the task scope.
- Fix issues introduced by the change. Report pre-existing issues separately;
  do not rewrite untouched template files or vendored code to satisfy formatting.
- Do not use unsafe automatic fixes or change guard logic to silence a check.
- Ruff complements pytest; it does not replace behavior tests.

### Gitleaks: secrets before commit and push

- Before each commit, scan the staged diff from the repository root in Bash:

  ```bash
  set -o pipefail
  git diff --cached --no-ext-diff --no-textconv --no-color | gitleaks stdin --redact
  ```

- Before pushing, scan repository history with `gitleaks git --redact .`.
- Keep redaction enabled. Never print suspected secrets in chat, logs, or reports.
- Resolve findings before committing or pushing. Do not bypass the scan or add
  broad exclusions merely to make it pass; verify and narrowly document false positives.
- Keep .env, logs/, data/*.db, and local dependency directories out of commits.
- Report which checks actually ran and their results. A skipped or unavailable
  scan is not a successful scan.

Command references: [uv](https://docs.astral.sh/uv/pip/environments/),
[Ruff](https://docs.astral.sh/ruff/), [Gitleaks](https://github.com/gitleaks/gitleaks).

## Design toolkit

- Before UI work, read DESIGN.md. It defines the default visual language.
- Use .agents/skills/web-design-guidelines/SKILL.md for UI/accessibility reviews.
  Its "WebFetch" means the available web-reading tool; it is not a required tool name.
  If the upstream guidelines cannot be fetched, use the bundled
  .agents/skills/web-design-guidelines/references/guidelines.md and disclose that it is a snapshot.
  For Streamlit, apply relevant user-facing rules; do not mechanically demand React-specific code.
- Use .agents/skills/playwright-cli/SKILL.md to inspect a running local UI.
  The skill and references are vendored; the CLI and browser need laptop setup
  described in docs/DESIGN-TOOLKIT.md.
  With the local npm dependency, replace playwright-cli with npx --no-install playwright-cli.
- Read only the relevant skill and references. Do not load the whole reference library.
- The optional Linear reference does not override DESIGN.md.
- These are development tools, not tools automatically exposed to the product's runtime agent.

## Verification

Check the main user flow and loading, empty, success, and error states when implemented.
For UI work, inspect desktop and mobile layouts and browser console errors.
Use synthetic data for UI checks. Do not send real messages or trigger paid business actions
as part of a design check. Report checks actually performed and any setup blockers.

Python checks: pytest. Application: streamlit run app.py.
See README.md for environment and demo database setup.
