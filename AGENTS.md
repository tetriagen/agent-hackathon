# Project guidance

This is a generic Python / Streamlit hackathon starter. No business case is selected.
Preserve the existing application and agent behavior unless the task requests changes.

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
