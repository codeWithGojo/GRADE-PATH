# GradePath: handoff to Codex

Prepared 24 November 2026 after the V4 red redesign. Read this file first, then `docs/GRADEPATH_IMPLEMENTATION_STATUS.md` and `docs/LANDING_SECTIONS.md`.

- **Product:** GradePath, a study workspace for Nigerian secondary and university students. Owner: Dev Boyz / Favour Imegu.
- **Repo:** https://github.com/codeWithGojo/GRADE-PATH (local clone: `C:\Users\FAVOUR\Documents\GRADE-PATH`)
- **Production:** https://gradepath-theta.vercel.app/ (Vercel project `gradepath`, team `favour12`). The site deploys automatically from `main`.
- **Plus price:** ₦1,000/month (test mode only; live charging is off).

## 1. Current state (read before doing anything)

- **The V4 redesign is staged on local `main` but NOT committed.** The commit failed because git on this PC had no `user.name` / `user.email`. Check `git status` first. If the changes are still staged, ask the owner to set the identity, then commit. Don't discard them.
- **Nothing is pushed.** A push to `main` deploys production. Work on a branch (`codex/...`) and open a PR instead. Promote to production only when the owner asks.
- `.claude/` is untracked local tooling. Don't commit it.
- Baseline: `npm test` 31/31 pass; `npm run build` produces 37 files.

## 2. Stack and hard constraints

- Plain HTML, CSS and browser JavaScript; no framework and no bundler. **Do not migrate to Next.js** or add a frontend framework.
- Optional Node 24+ server (`server.mjs`, `server/`) for accounts, sync, AI tutor, Paystack and benchmarks. It uses SQLite locally and Neon PostgreSQL when `DATABASE_URL` is set. Vercel serves `api/gateway.mjs`.
- **CSP is strict** (`vercel.json` and `server.mjs`): `script-src 'self'; style-src 'self'`. That means:
  - no inline `<script>` or `<style>`, and no `style="..."` attributes in HTML;
  - setting `element.style.*` from JS is fine;
  - no CDN fonts or scripts. Self-host everything in `vendor/`.
- **Routing is hash-based.** `#overview`, `#grades` etc. are app pages. Valid page names come from `.nav a` links in the sidebar. An unknown hash falls back to `#overview`. The landing page shows only when there is no hash. **Never use `href="#section"` for in-page links on the landing page**; use `data-lp-scroll="lp-..."`.
- **Adding a public file means updating three lists:** `scripts/build.mjs` (build allowlist), `sw.js` (offline cache) and `server.mjs` (`staticFiles`). Forgetting one breaks production, offline mode or local dev.
- **Don't break student data.** Local state lives in localStorage key `gradepath-v2` (schema v3, normalised by `core.js`). Theme uses `gradepath-theme`. University and Secondary data are separate. Never reset, drop or overwrite them silently.

## 3. File map

| File | Responsibility |
|---|---|
| `index.html` | All markup: landing sections, app shell, every page, templates |
| `tokens.css` | **Single source of design tokens**: colours, fonts, space, radii, shadows, motion; light/dark; University (red) / Secondary (burgundy) |
| `styles.css` | Base elements, controls, forms, app shell (sidebar, topbar, phone dock, sheets), overview, feature pages, motion |
| `surfaces.css` | Account flow, AI Study Pal, study calendar |
| `learn.css` | Nigerian History and Formula library pages |
| `landing.css` | Landing page, one block per section, in page order |
| `appearance.js` | Applies saved theme/mode before first paint |
| `core.js` | Pure calculations, validation, state normalisation, backup migration |
| `catalog.js` | Resources, practice questions, coding lessons |
| `learn-content.js` | **Reviewable content records**: history stories, language registry, formula topics |
| `learn-core.js` | Deterministic formula solvers (pure, tested) |
| `learn.js` | Renders the History and Formula pages from the records |
| `app.js` | Shared helpers (`window.GP`), local state, routing, mode switch, overview |
| `grades.js` / `school.js` / `study.js` / `exams.js` / `lab.js` / `projects.js` | Feature pages |
| `online.js` / `account-lifecycle-ui.js` | Account, sync, tutor, billing, benchmark UI |
| `experience.js` | Mode pill, theme toggle, phone menu/entry sheets, nav icons, scroll progress |
| `surfaces.js` | Calendar, Study Pal shortcuts, touch feedback |
| `landing.js` | Hero canvas, header, in-page scroll, reveals, magnetic CTAs, formula toggle, live Study Pal status |
| `server.mjs`, `server/*.mjs`, `api/gateway.mjs`, `migrations/postgres/` | Backend |
| `test/*.test.mjs` | Node tests (`node --test`) |

Script load order (all `defer`): core → catalog → learn-core → learn-content → account-lifecycle-ui → app → grades → study → exams → lab → online → school → projects → experience → surfaces → learn → landing. `app.js` creates `window.GP`; later scripts depend on it.

## 4. Design rules (owner's standard)

- **Palette:** red / near-black / warm white. Red is for emphasis and primary actions, not whole surfaces. **No purple or lilac; avoid green-led themes.** Burgundy marks Secondary mode.
- **Type:** Fraunces for display (italic for emphasis), Inter for body and controls.
- **Tokens only:** use `var(--accent)`, `var(--ink)`, `var(--surface)` and so on from `tokens.css`. Don't hard-code hex values in workspace CSS. The legacy aliases (`--blue`, `--blue-dark`, `--soft`, `--navy`) exist only because `grades.js` reads them for the chart. Don't use them in new code.
- **Motion:** 180–300 ms for UI changes (`--dur-1..3`), `--ease-out` / `--ease-spring`. Magnetic CTAs use a spring with stiffness 500 and damping 40. Everything must collapse under `prefers-reduced-motion`.
- **Mobile first:** test at 320, 360, 390, 768, 1024 and desktop widths. No horizontal overflow, 44 px minimum touch targets, safe-area padding, readable forms.
- **Layout:** editorial and asymmetric; avoid card-grid sameness. Every screen needs designed empty, loading, error and success states.
- **Honesty:** never claim a feature, content, language, AI provider, payment or deployment works unless it does. No invented user counts, outcomes, endorsements or national rankings.

## 5. Content rules (Learn section)

- All content lives in `learn-content.js` as structured records. UI code must not hard-code lesson text.
- Every record has `review.status`. All current history stories and formula topics are `"draft"`, and the UI labels them that way. Only change one to `"reviewed"` when a named, qualified reviewer has signed off, and fill in `reviewer` and `lastReviewed`.
- History stories need sources, evidence types (`archaeology`, `documentary`, `oral`, `interpretation`) and multiple viewpoints where contested. Images, audio and oral recordings require recorded permission and credit in `rights`.
- **No Nigerian-language course may be marked `"open"`** until it has a reviewed curriculum, two native-speaker validators, an orthography/variant policy and tested input/display. `test/learn.test.mjs` enforces this. Don't add speech features without checking quality per language, and always keep a text option.
- Formula calculations must go through `learn-core.js` with tests, never through an AI model. Each topic's worked example is computed by the solver, so changing a solver changes the example. The tests catch mismatches.

## 6. Landing page

Ten sections, `lp-hero` → `lp-footer`, each wrapped in `SECTION START/END` comments with its own `landing.css` block. See `docs/LANDING_SECTIONS.md` for the map and the replace/reorder/remove rules. Numbers on the page (48 questions, 8 subjects, 4 lessons, 12 stories) are real counts. Update them when `catalog.js` or `learn-content.js` changes.

## 7. Verified vs not verified

**Verified (24 Nov 2026):** tests and build; browser at 1024 and 390 px; overflow sweep of every page at 320 px; light and dark themes; both modes; CGPA sample = 4.33; History filters (map click, keyboard, era); formula calculator solve, rearrange and error states; landing mobile menu and scroll links; Study Pal status line correctly says "not switched on" locally.

**Not verified:** service-worker/offline (the embedded test browser refused SW registration; check in Chrome/Edge); accounts, sync, verification and recovery end to end; Paystack test flows; any live AI call; physical Android/iPhone; screen readers; Vercel preview.

## 8. Next tasks, in priority order

1. **Commit and open a PR.** Once the owner's git identity is set, commit the staged redesign, move it to a `codex/v4-red-redesign` branch, push, open a PR and verify the Vercel preview. Check every page on the preview at mobile and desktop widths, and confirm there are no console errors.
   *Done when:* PR open, CI green, preview checked, production untouched.
2. **Offline check.** In Chrome/Edge on the preview, confirm `sw.js` registers, caches every asset in its list (including the Fraunces fonts and `learn*`/`landing*` files) and reopens offline.
3. **Re-test the account and billing lifecycle on the preview.** Cover register, verify, login, sync (including conflict resolution: never replace local data with empty server data), export, delete and Paystack **test-mode** checkout/webhook/renewal/cancel.
   *Done when:* each flow is marked working, partial or broken in the status doc, with evidence.
4. **AI provider adapter.** Refactor `server/ai.mjs` behind a provider interface (OpenAI today). Add DeepSeek only if the owner supplies a key and accepts the terms. Keep keys server-side and enforce quotas on the server (free 3/day, Plus 60/period, admin configurable). Show a truthful unavailable state, and add tests with mocked providers.
5. **Content review workflow.** Add a simple way to record reviewer sign-off (fields already exist). Expand formulas only with reviewed material: more secondary physics/chemistry and university topics in mechanics, electrical and fluids. Every topic needs a solver and tests.
6. **Practice expansion.** Add WAEC/NECO/JAMB topic plans, mock sessions and spaced repetition using original or licensed questions only. JAMB mocks total 400. Never present scores as official.
7. **Accessibility pass.** Screen-reader test (NVDA), keyboard-only run through every page, and colour contrast in both themes and both modes.
8. **Design polish still open:** the overview hero illustration could be richer; Practice/Exams/Study Room are restyled but not recomposed; consider a desktop sidebar collapse.

## 9. Commands

```sh
npm ci --ignore-scripts      # install (pg only)
npm test                     # 31 tests: calculations, modes, backend flows (mocked), learn library
npm run build                # dist/ via explicit allowlist
node server.mjs --port 3007  # local server (SQLite); open http://localhost:3007
```

Windows users can double-click `START-WINDOWS.cmd`. Copy `.env.example` to `.env` only when configuring the backend. **Never commit `.env`, data, logs or secrets**, and never print keys in logs or chat.

## 10. Working agreement

- Inspect the code before editing and preserve working behaviour.
- Small logical commits on a branch. CI runs on `main`, `feat/**`, `codex/**` and `claude/**`.
- Run tests and the build, then check the rendered pages at mobile and desktop widths before calling anything done.
- Update `docs/GRADEPATH_IMPLEMENTATION_STATUS.md` when a status changes.
- Report honestly: what was verified, what wasn't, and what needs credentials.
