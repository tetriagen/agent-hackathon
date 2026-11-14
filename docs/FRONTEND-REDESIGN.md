# ClearBill frontend redesign

Software: medical bill and EOB review for individual patients. Primary action: Check your bill.

Dark blue-black palette with sky-blue controls; the user's frosted red cross and copper coins provide the main visual. Geist/system sans stack. Product-stage hero, then a real review workspace. No invented customer proof, pricing, payment flow or login wall.

The existing scroll-driven orbit is retained as requested. Taste's motion layer is vendored unchanged in web/assets/motion; entrance boot is external to comply with the app CSP. No external fonts or scripts are requested. Forms remain native and keyboard accessible. Reduced motion stops the orbit and entrance. Variable-length findings and letters determine workspace height rather than rigid marketing section heights.

Reference research:
- https://www.details.so/inspo/category/saas — hero and feature-card catalogue, particularly the listed Antimetal and Nova examples. Thumbnail fetches were unavailable; these were not treated as visually inspected screenshots.
- https://refero.design/ — upload/download, dark-mode, cards and billing pattern catalogue. Individual screens were restricted or not readable; no authenticated assets were copied.
- https://designspells.com/spells/orb-picker-in-elevenlabs — object interaction direction.
- https://designspells.com/spells/interactive-magnifier-in-preview — feedback at the point of interaction.

The existing product code and user-provided reference remain the source of the actual illustration. No stock media or borrowed product imagery was added.

## Behavior

- Local document reading and explicit original-PDF AI consent remain intact.
- Paste/inspect text and extraction comparison are disclosure panels.
- Server `duplicates` results now show source rows, skipped rows and coverage.
- `review_letter` is used for combined findings, including duplicate-only letters; explicit null hides the letter. The previous template is a compatibility fallback only when the field is absent.
- Letters remain editable, downloadable, and never sent automatically.
- Synthetic self-pay example takes the user directly to confirmed facts.
- Accounts, saved history, billing and a user database are not added. Hackathon flow remains available without login.

## Verification

Repository Playwright CLI with Chromium, synthetic local PDFs and mocked AI responses:
- 1440, 1024, 768, 390, 320 px: no horizontal overflow.
- Local PDF reading; AI blocked until consent.
- Self-pay example: 900 vs 1650 yields 750; draft download works.
- Combined payment + duplicate findings, source text, editable letter, downloaded edited text.
- Reduced-motion canvas remains unchanged across scroll.
- Simulated AI 503 recovers controls and shows an error; this intentional 503 is the only browser console error.
- Client test command passes; changed JS syntax checks pass.
- Taste copy lint: 0 FAIL, 0 WARN.

GATE: ERROR — Taste's browser checks could not find Chrome/Edge/Chromium. Its consistency/layout/performance checks are not claimed as passed. The repository's independent Playwright checks above did run. No gate waivers were added.
