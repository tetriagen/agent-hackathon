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

## Reference-directed hero revision

The user subsequently selected https://www.details.so/inspo/grail-app-a14d35 explicitly. Its embedded animation was opened in Chromium and visually inspected at 0, 3, 7 and 12 seconds. Observed: black background, oversized high-contrast serif headline, perspective card field and a scroll transition into a stack. This supersedes the earlier cross-and-coins hero.

The new hero uses original HTML medical-document illustrations, clearly marked synthetic, with the existing demo amounts (900 / 1650 and 43.06 / 53.83). These are decorative facsimiles, not uploaded patient documents or embedded PDF files. Original ClearBill card backs replace Grail's branded artwork. No reference-site code, media or fonts were copied. Headline: “PAYING TOO MUCH?”; primary action: “Check your bill”.

Pointer movement changes document perspective; native scrolling gathers the cards. There is no idle animation, scroll hijacking or network request for the decorative documents. Reduced-motion users see a static composition. The review workspace and API behavior are unchanged.

Playwright verification passed at 1440, 1024, 768, 390 and 320 px: no horizontal overflow, CTA visible at the tested 900 px height, pointer and scroll reactions, static reduced-motion state, and the full synthetic self-pay comparison returning $750. Additional 390×844 screenshot inspected. No page errors. New hero screenshots are in the workspace work directory.

## Floating documents and gated workspace

Cards now levitate with individual low-frequency phases. Pointer and scroll input use frame-rate-independent exponential smoothing. Scrolling gathers the documents into a pink folder, shrinks it into the Check your bill icon, and triggers a single magnifier sweep. Scrolling backward restores the scene. A pause control freezes autonomous movement; reduced motion disables the choreography. Rendering stops when offscreen or the tab is hidden. Geometry is measured on scroll/resize, not on every animation frame.

The workspace starts hidden, including when opening a saved #workspace URL. Check your bill reveals it and moves keyboard focus to its heading. Privacy information opens in a separate native dialog without revealing the workspace. Reload starts again with the workspace hidden; no entered data is persisted.

Browser checks passed: levitation, pause/resume, folder docking, reverse scroll, reduced motion, 390 px overflow check, CTA; initial hidden state, separate privacy dialog and Escape, click-to-open, synthetic comparison and hidden state after reload.

## Separate landing and review pages

Supersedes the single-page hidden workspace above: `/` now contains only the animated hero, product explanation, three capabilities, privacy explanation and review links. `/review.html` contains the actual upload, analysis and letters workflow. Check your bill navigates to this second page; it is directly addressable. The landing does not load app.js or call the AI health endpoint. Both pages retain independent privacy dialogs. Browser checks passed for navigation, direct review display, the $750 synthetic comparison, privacy dialog, return home and mobile overflow. No browser page errors.

## Document processing animation and free page scrolling

The user's two Design Spells clips (Chengyu Calendar and adding a card in Apple Wallet) were opened in Chromium and inspected as video frames. The implementation uses original CSS 3D paper faces with rotations around all three axes and a perimeter magnifier; completion uses locally rendered rose particles gathering into a document silhouette and a checkmark. No reference media or code is bundled.

Local file reading and optional consented AI extraction open a native modal with a translucent blurred backdrop. Successful operations finish the current 3.2-second animation cycle, followed by a 1.15-second completion phase. Fast operations therefore display for about 4.35 seconds. Once processing has returned, the status explicitly says the document is ready and the preview is finishing. Long operations cannot display success before the actual result. Errors close the animation immediately and show the existing error message. There is no invented percentage or claim that analysis is still running after completion. Hide animation and Escape dismiss the visual without cancelling the underlying operation. Pause motion and reduced motion are supported; reduced motion skips the artificial cycle delay.

The review page now shares the landing's black / warm paper / rose palette and serif headings. The landing hero is no longer sticky and has no extra animation scroll runway: it moves with ordinary scrolling, while document gathering follows progress in parallel.

Verified in Chromium: minimum successful presentation time, completion phase, malformed-PDF error recovery, reduced-motion fast completion, hide action, 390 px modal screenshot and ordinary hero movement of 250 px for 250 px scroll. Mocked AI extraction also retains the combined editable letter. Tests use synthetic documents and fixtures; no paid AI calls.

### Separate review steps

The review now shows one step at a time: read documents, verify findings, prepare a letter. Verification has keyboard-accessible Document findings and Self-pay comparison tabs. Local extraction and AI findings appear in verification; drafts only appear on the letter step. AI drafts require a source-check confirmation before continuing. Self-pay comparison must succeed before its Next button enables. Navigation preserves edits; replacing a document clears its AI draft, and changing comparison facts clears its self-pay draft. Printing still targets only the self-pay letter. Later steps use a compact page header.

Verified desktop/mobile navigation, empty state, keyboard tabs, self-pay success and invalidation, mocked AI findings/confirmation/draft editing/document replacement, comparison error recovery, and print visibility. No live AI requests were used. Client tests, JavaScript syntax and diff whitespace checks pass.

### Shared AI action

Replaced per-document AI consent and review buttons with one shared consent and one Review with AI action below the upload cards. The selected PDF filenames are listed before consent; text files and pasted text remain local. Original PDFs are processed sequentially with one loading animation and separate findings per document. Changing a file or its text clears shared consent. Partial failures retain completed findings and state how many PDFs were reviewed.

Browser verification used mocked responses: consent gating, two PDFs, a single PDF alongside a text file, replacement consent reset, partial failure, desktop/mobile layout, and no runtime exceptions. No live AI requests were sent.

### Optional estimate and review-only polish

Bill/EOB is the primary upload. The estimate is a native disclosure with an added-file label; hiding it never clears its data or excludes it from shared AI review. Demo and reset manage its expanded state. All parsing, comparison and letter-generation rules are unchanged. Review-only polish reduces introductory clutter, aligns content, flattens upload borders, pairs comparison questions on desktop, and improves paper-letter typography. Landing remains unchanged by explicit request. See REVIEW-DESIGN-AUDIT.md for skill checks, exceptions and browser/test evidence.
