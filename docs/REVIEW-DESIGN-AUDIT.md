# ClearBill review interface audit — 2026-11-15

GATE: DONE (User explicitly requested leaving the landing page unchanged)

## Scope and outcome

Only the working review interface was refined: document upload, optional estimate, verification tabs, self-pay comparison, generated letter, privacy dialog, and processing states. The user explicitly excluded the landing page. No landing HTML, hero code, animation code, or landing CSS selectors were edited. All added CSS is scoped to `.review-page`.

The existing visual direction is preserved: near-black background, rose actions, warm paper, serif headings, sans-serif controls. This is an Operate surface, not a new marketing design. The copy remains factual and restrained; synthetic examples and original-PDF consent remain explicit.

## Impeccable technical audit

Source: https://github.com/pbakaus/impeccable (downloaded skill in temporary workspace).
The context launcher initially failed because the downloaded launcher lacked executable permission. Per its fallback, existing DESIGN.md, docs/CLEARBILL.md and rendered screens supplied context. Its detector was then run via `sh` with the installed Chromium path.

Source-only scanning produced misleading contrast findings from unresolved inherited styles. These were checked against the served page: the live detector reported only nested upload cards. After flattening that hierarchy, the final live scan of `/review.html` returned `[]` (exit 0). This is not a WCAG certification; dynamic steps were checked separately in the browser.

| Dimension | Manual score / 4 | Evidence and limits |
|---|---:|---|
| Accessibility | 3 | Named controls, native disclosures, keyboard tabs, focus, Escape, heading order; no screen-reader session performed. |
| Performance | 3 | Local assets and existing finite processing effect; no performance benchmark on a physical phone. |
| Theming | 3 | Consistent rose/paper palette and new semantic review tokens; older hard-coded colors remain. |
| Responsive | 3 | 320, 390, 768, 1024, 1440 px; no horizontal overflow. Desktop browser emulation, not physical touch-device certification. |
| Implementation integrity | 4 | Original flow and source state preserved; optional estimate and stale-result invalidation verified. |
| Total | 16 / 20 | Good; remaining limits are documented. |

### Findings and disposition

- P1: upload headings skipped h2. Fixed with correctly ordered section headings.
- P2: two equal upload cards obscured the primary task. Bill is now primary; estimate is a native optional disclosure. Collapsing does not discard it; its filename remains visible.
- P2: too much introductory content before upload on mobile. Removed redundant eyebrow and idle notice, compacted heading/actions/spacing.
- P2: nested card borders competed with the actual upload target. Removed the outer decorative card shell.
- P2: self-pay form wasted a desktop column. Replaced it with a full-width form and paired questions where space allows.
- P2: letter used technical monospace styling. Changed only presentation to readable text on warm paper; download content unchanged.
- P2 remaining: legacy shared CSS still contains repeated hard-coded colors. No broad rewrite was made because it could affect the excluded landing page.

Recommended future action: extract remaining review-only color values into existing tokens during a scoped maintenance pass; finish with Impeccable polish. No blocking issue remains in the tested flows.

## Functional verification

- 97 Python tests passed: billing, consistency, duplicate services, extraction.
- Client tests passed.
- Upload: one PDF, two PDFs (including estimate collapsed after selection), PDF plus text, no-consent guard, consent reset, partial AI failure; mocked AI only, no paid request.
- Verify and letter: self-pay request through real local API, correct $750 difference, Next/Back, stale draft invalidation, keyboard tabs, edited AI letter persistence, print visibility.
- Layout: upload/verification/letter at 320–1440 px; desktop and phone screenshots reviewed. Privacy dialog opens/closes by keyboard. No runtime JS errors in these checks. A mocked HTTP 500 is intentional error-path coverage.
- Processing animation logic is unchanged by this pass.
- Public deployment cannot be verified without its URL. Git push alone does not establish that a deployed host updated.

## Taste review

Taste was used as a second design check. Its landing gate ran before the user narrowed scope, then was closed at that explicit instruction. It was not reported as PASS. The remaining landing findings are preserved below; none was used to override the user's request.

The review-page consistency scan had no runtime errors. Several marketing-page heuristics do not fit a live form: full-screen sections, mandatory artwork, maximum two hero actions, fixed marketing grid, and prohibition on h2 inside the first section. Those are documented as applicability limits rather than hidden from the checker. The concrete button-family and nested-shell problems were addressed. No waivers file was created and no skill source was modified.

Awwwards MCP was not found in connected tools or plugin discovery, so it was not used.

## Landing findings left unchanged at the user's request

1. `spill` — div.bill-stage > div.bill-universe > div.bill-float.bill-float-1 > div.paper-front "PDF ClearBill / Demo 02 Insurance statem": runs 166px past the bottom edge of the panel it sits on (div.bill-stage > div.bill-universe > div.bill-float.bill-float-0 > div.paper-front) (and 1 more like it: div.paper-back.paper-back-eob)

2. `spill` — div.bill-stage > div.bill-universe > div.bill-float.bill-float-4 > div.paper-front "PDF ClearBill / Demo 05 Insurance statem": runs 105px past the bottom edge of the panel it sits on (div.bill-stage > div.bill-universe > div.bill-float.bill-float-3 > div.paper-front) (and 1 more like it: div.paper-back.paper-back-eob)

3. `spill` — div.bill-stage > div.bill-universe > div.bill-float.bill-float-5 > div.paper-front "PDF ClearBill / Demo 06 Patient document": runs 19px past the top edge of the panel it sits on (div.bill-stage > div.bill-universe > div.bill-float.bill-float-2 > div.paper-front) (and 1 more like it: div.paper-back.paper-back-estimate)

4. `spill` — div.bill-stage > div.bill-universe > div.bill-float.bill-float-6 > div.paper-front "PDF ClearBill / Demo 07 Patient document": runs 124px past the right edge of the panel it sits on (div.bill-stage > div.bill-universe > div.bill-float.bill-float-2 > div.paper-front) (and 1 more like it: div.paper-back.paper-back-bill)

5. `spill` — div.bill-stage > div.bill-universe > div.bill-float.bill-float-7 > div.paper-front "PDF ClearBill / Demo 08 Insurance statem": runs 88px past the bottom edge of the panel it sits on (div.bill-stage > div.bill-universe > div.bill-float.bill-float-1 > div.paper-front) (and 1 more like it: div.paper-back.paper-back-eob)

6. `spill` — div.bill-stage > div.bill-universe > div.bill-float.bill-float-8 > div.paper-front "PDF ClearBill / Demo 09 Patient document": runs 63px past the top edge of the panel it sits on (div.bill-stage > div.bill-universe > div.bill-float.bill-float-3 > div.paper-front) (and 1 more like it: div.paper-back.paper-back-estimate)

7. `cut-text` — div.bill-float.bill-float-2 > div.paper-front > div.paper-foot > span:nth-of-type(1) "Synthetic illustration": cut 12px at the bottom by the overflow of div.bill-stage > div.bill-universe > div.bill-float.bill-float-2 > div.paper-front (and 1 more like it: "Synthetic illustration")

8. `no-visual` — main#main > section.bill-hero "PAYING TOO MUCH?": no picture, effect or mock in this section; a feature section needs a visual

9. `no-visual` — section#how-it-works "See the details. Know what to ask.": no picture, effect or mock in this section; a feature section needs a visual

10. `no-visual` — main#main > section.overview-privacy.wrap "Start locally. Choose when to use AI.": no picture, effect or mock in this section; a feature section needs a visual

11. `text-only` — main#main > section.overview-close.wrap "A second look at your bill.": the closing section is only text: no picture, icon, mock or effect in it

12. `same-action` — section.bill-hero > div.bill-stage > div.bill-hero-action > a.btn.btn--primary "Check your bill ↗": "Check your bill ↗" appears 3 times in different looks: pill, fill #f2b0a5, outline #f2b0a5 and soft, fill #f2b0a5, outline #f2b0a5

13. `copy-headline` — h1#hero-title "PAYING TOO MUCH?": "PAYING TOO MUCH?" does not name what is sold (medical bill review, medical, bill, review, from flags); only the line under it does

14. `copy-fact` — h1#hero-title "PAYING TOO MUCH?": the first screen holds no number, price, date, place, platform or genre

15. `copy-headings` — h2#overview-title "See the details. Know what to ask.": "See the details. Know what to ask." names no product, part, place or section (4 headings like it; at most one brand line per page) (and 3 more like it: "Check totals that don’t ", "Leave with a letter read", "Start locally. Choose wh")

16. `heading-scale` — h2#overview-title "See the details. Know what to ask.": h2 headings in 2 sizes, 44px ("A second look at your bi") to 64px (x1.45)

17. `off-grid` — header.site-header > div.wrap.nav-inner > a.brand "+ ClearBill .": left edge at 61.5px, 18.5px off the page margin at 80px (8 elements)

18. `tilt` — section.bill-hero > div.bill-stage > div.bill-universe > div.bill-float.bill-float-0 "PDF ClearBill / Demo 01 Patient document": turned in 3D (and 8 more like it: "PDF ClearBill / Demo 02 ", "PDF ClearBill / Demo 03 ", "PDF ClearBill / Demo 04 ", "PDF ClearBill / Demo 05 ", ...)

19. `links` — header.site-header > div.wrap.nav-inner > nav > a:nth-of-type(3) "Your privacy": "Your privacy" goes to #privacy, which is not on this page

20. `links` — main#main > section.overview-privacy.wrap > div:nth-of-type(2) > a.link "Read how your documents are handled ↗": "Read how your documents are handled ↗" goes to #privacy, which is not on this page

21. `links` — footer.wrap.site-footer > a:nth-of-type(2) "How your documents are handled ↗": "How your documents are handled ↗" goes to #privacy, which is not on this page

22. `moment-none` — (the page): a software page (--type) deals no moment: every kind carries one, two on a long page (moments.md)

23. `section-height` — footer.wrap.site-footer "ClearBill.Questions about a bill deserve": the section is 109px tall (0.1 screens), 791px short of one screen (900px): every section after the hero is one screen or two, 2px either way (SR-2)

24. `section-height` — main#main > section.overview-close.wrap "A second look at your bill.No account ne": the section is 335px tall (0.4 screens), 565px short of one screen (900px): every section after the hero is one screen or two, 2px either way (SR-2)

25. `one-section` — h2#close-title "A second look at your bill.": the screen at scroll 1743px (the top of section 3) shows 335px of section 4 and the heading of section 4 whole and the content of 3 sections, over 24px each beside section 3: a screen shows one section (another may peek 8px, 24px WARN) (SR-4)

26. `one-section` — section#how-it-works "A medical bill should make sense.See the": the screen at scroll 76px (the top of section 1) shows 76px of section 2 beside section 1: a screen shows one section (another may peek 8px, 24px WARN) (SR-4)

27. `one-section` — main#main > section.overview-privacy.wrap "Your documents. Your decision.Start loca": the screen at scroll 900px (stride 1) shows 16px of section 3 beside section 2: a screen shows one section (another may peek 8px, 24px WARN) (1 of 4 screens show a peek: two or more on a page of 8 sections or fewer FAIL) (SR-4)

28. `one-heading` — h2#overview-title "See the details.Know what to ask.": headings of two sections show whole on one screen at 10 of 35 scroll positions (28.6%; at scroll 350, 400, 450, 500px), here with "+": at most 3% on a desktop (SR-5)

29. `container-edges` — main#main > section.bill-hero "PAYING TOO MUCH? PDFClearBill / Demo01Pa": the content of section 1 runs 32px from the left and 263px from the right (read from its outermost blocks: no .wrap): the page's container starts at 80px; 32 and 263px are not one margin; the margin is 64-120px at 1440px (one container, equal margins, 2px either way) (SR-6)

30. `container-edges` — header.site-header "+ClearBill. How it worksCheck your billY": the nav's content runs 32px from the left and 32px from the right: the page's container starts at 80px; the margin is 64-120px at 1440px (one container, equal margins, 2px either way) (SR-6)

31. `container-edges` — a.skip-link "Skip to content": a <a> at the top of the page, outside header.nav, main, footer.closing and nav.actionbar (SR-6)

32. `container-edges` — main#main > section.bill-hero > div.bill-stage > div.stage-side.stage-side-right "Scroll to sort ↓": "Scroll to sort ↓" runs 1392-1407px, outside the container lines of section 1 at 32-1177px: full width is for background layers and grounds only (SR-6)

33. `container-edges` — h1#hero-title "PAYING TOO MUCH?": "PAYING TOO MUCH?" runs 103-1337px, outside the container lines of section 1 at 32-1177px: full width is for background layers and grounds only (SR-6)

34. `container-edges` — h2#close-title "A second look at your bill.": 1 text block starts on a left line at x 476, 396px from the container's left: text starts on the container's left, or on one split line (x 623, 732, 841) (and 4 more like it: "A second look at your bi", x 467, x 151) (SR-6)

35. `row-lines` — section#how-it-works > div.benefit-rows > article:nth-of-type(2) "02 / ReviewLook for repeated services.Fi": a row of 3 items: its items are 15/60/77px tall, not one height (2px either way) (SR-7)

36. `row-lines` — section#how-it-works > div.benefit-rows > article:nth-of-type(1) "01 / CompareCheck totals that don’t add ": a row of 3 items: its items are 15/60/51px tall, not one height (2px either way) (SR-7)

37. `row-lines` — section#how-it-works > div.benefit-rows > article:nth-of-type(3) "03 / AskLeave with a letter ready to edi": a row of 3 items: its items are 15/60/51px tall, not one height (2px either way) (SR-7)

38. `row-lines` — main#main > section.bill-hero > div.bill-stage > div.stage-side.stage-side-right "Scroll to sort ↓": "Scroll to sort ↓" ends at 1407px, past the container's right line at 1177px (SR-7)

39. `row-lines` — h1#hero-title "PAYING TOO MUCH?": "PAYING TOO MUCH?" ends at 1337px, past the container's right line at 1177px (SR-7)

40. `cut-text` — div.bill-float.bill-float-0 > div.paper-front > div.paper-top > span:nth-of-type(2) "ClearBill / Demo": cut 20px at the left by the overflow of main#main > section.bill-hero > div.bill-stage (and 7 more like it: "$1,650.00", "Every detail matters.", "PDF", "Insurance statement", ...)

41. `cut-text` — div.bill-universe > div.bill-float.bill-float-0 > div.paper-front > h3 "Medical bill": cut 47px by the left edge of the screen (and 8 more like it: "Additional charges", "+", "ClearBill.", "$53.83", ...)

42. `cut-text` — div.paper-front > div.paper-table > div.paper-row:nth-of-type(2) > span "Estimated total": cut 3px at the bottom by the overflow of div.bill-stage > div.bill-universe > div.bill-float.bill-float-2 > div.paper-front (and 5 more like it: "$900.00", "Estimated total", "$750.00", "$53.83", ...)

43. `cut-text` — div.bill-universe > div.bill-float.bill-float-2 > div.paper-back.paper-back-estimate > span "+": cut 33px at the top by the overflow of div.bill-stage > div.bill-universe > div.bill-float.bill-float-2 > div.paper-back.paper-back-estimate

44. `cut-text` — div.bill-float.bill-float-3 > div.paper-front > div.paper-top > span:nth-of-type(2) "ClearBill / Demo": cut 22px at the right by the overflow of main#main > section.bill-hero > div.bill-stage (and 8 more like it: "Medical bill", "$1,650.00", "Every detail matters.", "Patient documents", ...)

45. `cut-text` — div.bill-universe > div.bill-float.bill-float-3 > div.paper-back.paper-back-bill > span "+": cut 57px by the right edge of the screen (and 7 more like it: "ClearBill.", "+", "ClearBill / Demo", "Good faith estimate", ...)

46. `off-grid` — main#main > section.bill-hero > div.bill-stage > button.motion-toggle "Pause motion": left edge at 16px, 4px off the page margin at 20px (21 elements)

47. `off-grid` — header.site-header > div.wrap.nav-inner > a.brand > span.brand-mark "+": left edge at 16px, 4px off the page margin at 20px (21 elements)

48. `spill` — section.bill-hero h1 "PAYING TOO MUCH?": x 28.8 to 1411.2, the page runs 80 to 1360

49. `edge-left` — #how-it-works p "Between a provider’s bill and an": starts at x 752; the lines are 80 and the column starts

50. `edge-left` — #how-it-works h3 "Check totals that don’t add up.": starts at x 416; the lines are 80 and the column starts

51. `edge-left` — #how-it-works p "Compare reported payments with t": starts at x 904; the lines are 80 and the column starts

52. `edge-left` — #how-it-works h3 "Look for repeated services.": starts at x 416; the lines are 80 and the column starts

53. `edge-left` — #how-it-works p "Find extracted rows with matchin": starts at x 904; the lines are 80 and the column starts

54. `edge-left` — #how-it-works h3 "Leave with a letter ready to edi": starts at x 416; the lines are 80 and the column starts

55. `edge-left` — #how-it-works p "Turn findings into a request for": starts at x 904; the lines are 80 and the column starts

56. `edge-left` — section.overview-privacy.wrap p "Read PDF and text files in your ": starts at x 752; the lines are 80 and the column starts

57. `edge-left` — section.overview-privacy.wrap p.note "Findings need your review. Clear": starts at x 752; the lines are 80 and the column starts

58. `screen-short` — section.bill-hero section.bill-hero "PAYING TOO MUCH? PDFClearBill / ": 824px tall; one screen under the nav is 900px

59. `screen-short` — #how-it-works section.overview-section.wrap "A medical bill should make sense": 884px tall; one screen under the nav is 900px

60. `screen-short` — section.overview-privacy.wrap section.overview-privacy.wrap "Your documents. Your decision.St": 415px tall; one screen under the nav is 900px

61. `screen-height` — section.overview-privacy.wrap section.overview-privacy.wrap "Your documents. Your decision.St": 415px, 0.46 screens; a section is exactly one or two (--h)

62. `neighbour` — section.overview-privacy.wrap section.overview-privacy.wrap "Your documents. Your decision.St": framed, 51px of section.overview-close.wrap section.overview-close.wrap "A second look at your bill.No ac" shows

63. `screen-short` — section.overview-close.wrap section.overview-close.wrap "A second look at your bill.No ac": 335px tall; one screen under the nav is 900px

64. `screen-height` — section.overview-close.wrap section.overview-close.wrap "A second look at your bill.No ac": 335px, 0.37 screens; a section is exactly one or two (--h)

65. `neighbour` — section.overview-close.wrap section.overview-close.wrap "A second look at your bill.No ac": framed, 109px of the footer shows

66. `hero-fold` — section.bill-hero section.bill-hero "PAYING TOO MUCH? PDFClearBill / ": starts at y 76, not under the nav


## Follow-up: three authorized landing fixes

The user subsequently authorized three narrow landing fixes: clipped text inside PDF cards, inconsistent Check your bill buttons, and header/section gutters. Updated only bill-hero.css: fitted text and back-face artwork inside the existing card sizes, standardized primary button radius/height/color/type (retaining the hero folder icon), and matched header gutters to the existing lower sections at desktop, tablet and mobile breakpoints. Decorative clipping at the scene/screen edges and the original choreography remain intentional.

Verified 1920, 1440, 1024, 768, 390 and 320 px: no overflow within card faces, no page horizontal overflow, matching header/section edges, consistent primary button computed styles. Inspected desktop/mobile screenshots. Your privacy opens its dialog and closes with Escape; free scrolling still works; no JavaScript runtime errors. The earlier 66-item list is historical, not a fresh count after these fixes.
