# GradePath V4: implementation status

Last updated 24 November 2026. Status words: **working** (built and checked), **partial** (built but limited or not checked end to end), **missing** (not built).

## This pass: red redesign and learning library

| Area | Status | Notes |
|---|---|---|
| Design tokens (`tokens.css`) | Working | Red / black / warm-white system with light and dark themes. University uses signal red; Secondary uses burgundy. Fraunces (display, OFL) + Inter (body), self-hosted. Old token names (`--blue`, `--soft`…) are kept as aliases so existing scripts still read valid colours. Purple, lilac, mint and navy are gone. |
| Landing page | Working | 10 modular sections with stable ids and START/END comments. Map: `docs/LANDING_SECTIONS.md`. Copy stays in markup for crawlers. |
| Landing navigation | Working | Sticky header that turns solid on scroll, in-page section links with current-section highlight, mobile menu with Sign in and Open workspace. |
| App shell | Working | Dark sidebar with grouped navigation (Results / Study / Learn / You), red active bar, sliding mode switch. Phone: sticky top bar, 5-tab dock (Home, Grades/Results, Study, Practice, Learn), menu sheet. Fixed an existing bug where the mode pill measured 0 px when entering from the landing page. |
| Nigerian History (`#history`) | Partial | 12 source-cited stories across 5 eras and 6 regions. Each one has evidence types, viewpoints where contested, an activity and sources. A schematic map works as a region filter. **All stories are drafts awaiting historian review** and are labelled that way in the UI. No images or audio are bundled. |
| Nigerian languages | Missing (by design) | Roadmap and registry only: Hausa, Igbo, Yorùbá in phase 1; Pidgin, Fulfulde, Kanuri in phase 2. Opening criteria are listed in the UI. No language is open, and a test enforces that. |
| Formula library (`#formulas`) | Partial | 8 topics (5 secondary, 3 university, with derivations), symbol/unit tables, assumptions, worked examples, practice, sources. The calculators use deterministic code in `learn-core.js`, with no AI involved, and are covered by `test/learn.test.mjs`. **Content awaits teacher/lecturer review** and is labelled as a draft. |
| Motion | Working | 180–300 ms transitions, spring-feel easing, section reveals, line-by-line hero title, river drawing, magnetic CTAs (spring 500/40, fine pointer only), calendar month slide, sheet entry. Everything is reduced under `prefers-reduced-motion`. |
| SEO | Partial | `robots.txt`, `sitemap.xml`, Open Graph tags. Workspace pages are hash routes, so only `/` is indexable. |

## Existing product (audited, unchanged in behaviour)

| Area | Status | Notes |
|---|---|---|
| University GPA/CGPA, retakes, presets, targets | Working | Sample semester still gives 4.33 (checked in the browser). |
| Secondary results and targets | Working | Separate data model; mode switch preserves both. |
| WAEC/NECO/JAMB plans and timed practice | Partial | 48 original questions (15 general + 33 exam, 8 subjects). Not a full curriculum bank. |
| Study Room, calendar, Practice, Coding Lab | Working | Restyled only. |
| AI Study Pal | Partial | OpenAI Responses adapter, server-side only. Defaults: free 3/day, Plus 60/period, admin 60, server cap 150/day. **No provider adapter for DeepSeek yet; no live provider call verified in this pass.** The landing page reads `/api/status` and says honestly whether it is switched on. |
| Accounts, sync, verification, recovery, export/deletion | Partial | Implemented in V4 (Neon/PostgreSQL migrations 001–003). Not re-tested end to end in this pass. |
| Paystack / GradePath Plus (₦1,000/month) | Partial | Test-mode flows only; live charging stays off. Not re-tested in this pass. |
| Peer benchmark | Partial | Opt-in, minimum 25 per cohort. No national claims. |
| Offline shell (service worker) | Partial | Asset list updated for the new files. Registration could not be checked in the embedded test browser, which refuses service workers. Check in Chrome/Edge. |

## Verification in this pass

- `npm test`: 31 passed, 0 failed (25 existing + 6 new learning-library tests).
- `npm run build`: 37 public files.
- Browser at 1024 px and 390 px, plus an automated horizontal-overflow sweep of every page at 320 px: no page overflows.
- Light and dark themes; University and Secondary modes; History filters (map click, keyboard Enter, era chips); formula calculator (solve, rearrange, error state).
- Not checked: physical Android/iPhone devices, screen readers, live AI/payment providers, Vercel preview deployment.

## Next steps before public launch

1. Get a historian to review the 12 history stories and a physics/engineering teacher to review the 8 formula topics; set `review.status` to `"reviewed"` with reviewer and date.
2. Recruit native-speaker reviewers for Hausa, Igbo and Yorùbá before writing any lessons.
3. Add a second AI provider adapter (e.g. DeepSeek) behind the existing tutor interface, with keys, terms and an end-to-end test.
4. Re-run the account, sync and Paystack test-mode flows on a Vercel preview.
5. Test on real phones (small Android, iPhone with a notch) and with a screen reader.
