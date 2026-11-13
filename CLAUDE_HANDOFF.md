# GradePath — implementation handoff

Prepared for Favour (Gojo), 13 November 2026.

## Current outcome

**Production:** https://gradepath-theta.vercel.app/

GradePath is a working browser-based study workspace with separate University and Secondary modes. It is built with plain HTML, CSS and JavaScript so the owner can edit it in VS Code without a frontend framework. The downloadable source also includes an optional Node/SQLite backend for accounts, AI tutoring, Paystack subscriptions and cohort benchmarks. That backend is not running on the public Vercel deployment.

The planned price is **₦1,000 per month** for Plus. The live site does not take payments or claim that paid features are active.

**Publishing status:** Vercel production is deployed and was opened successfully. GitHub push is pending: no GradePath repository was present in the connected `codeWithGojo` account, the connector cannot create repositories, and the browser repository-creation page required sign-in. Source and deployment are not connected to GitHub yet.

## What users can do now

| Area | Working capabilities | Practical limits |
| --- | --- | --- |
| University | Add/edit/delete semesters and courses; weighted GPA and CGPA; editable grade points on 4.0/5.0 scales; optional latest-grade replacement for repeated course codes; trajectory chart; PNG result sharing; draft CGPA preview; graduation target and required future GPA; CA/exam mark planning. | Results depend on the user's chosen grade and retake rules. Confirm institution-specific policies. It is not an official transcript. |
| Secondary school | Choose JSS 1–SS 3; save/edit/delete terms; add/remove subjects; enter marks from 0 to 100; set a personal target; see the latest mean, subject strengths, areas below target, and change from the previous saved term. | Equal-weight means. Up to 30 terms and 20 subjects per term. Terms are compared in saved order. No automatic official WAEC/NECO letter-grade conversion. |
| Exam preparation | WAEC, NECO and JAMB plans; subjects, confidence, mock marks, targets and assessment dates; revision tasks; original timed practice; official resource links. JAMB plans use English plus three subjects and show a mock total out of 400. | Mock marks are estimates for planning. Practice content is original, not an official or licensed past-question bank. Admission eligibility and subject combinations need official verification. |
| Study Room | Course/subject profiles, confidence, assessment dates, rule-based session suggestions, weekly tasks and completion tracking, saved resource links, pasted notes and TXT/Markdown import. Selectable-text PDF import runs locally on HTTPS or localhost. | Suggestions are rules, not AI. PDF extraction reads up to 30 pages with text limits; no OCR for scanned pages. Grades and notes are stored in the browser. |
| Practice | Timed question sets, answers with explanations, custom questions, recent results, mistake notebook and spaced review. | Starter collection: 15 general/coding questions plus 30 exam questions. The exam questions cover eight subjects, not the complete curriculum. |
| Coding Lab | Three guided lessons: an HTML course form, JavaScript weighted GPA and JavaScript task filtering. Starter code, hints, worked solutions, inert HTML preview and isolated, time-limited JavaScript checks. | A small teaching lab, not a full IDE. No Python runner or live AI teacher on the public deployment. |
| Resources and backups | Six curated learning links, three official exam destinations, user-saved resources, JSON export/import, legacy backup migration. | No live material search, automatic content collection, cloud backup or cross-device sync. Keep exported files private. |
| Personalization | Persistent school mode, light/dark theme, responsive navigation, distinct mode palettes, animated controls, page/section reveals, scroll indicator and back-to-top. | Reduced-motion preferences are respected. A full assistive-technology and device audit remains outstanding. |

The University semester records and Secondary term records are separate. Switching modes preserves both. Shared study tools remain available in either mode. Existing data is migrated using the retained `gradepath-v2` localStorage key; the state schema is now version 3. Theme preference uses `gradepath-theme`.

## Services included in source, but not live

### Accounts and storage

The optional Node backend implements email/password accounts, sessions and CSRF protection using SQLite. Accounts and opted-in benchmark records are server-side; ordinary study data remains browser-local. Signing in does not currently synchronize grades, tasks or notes. Email verification and password reset are not implemented.

### AI study and coding tutor

The backend integrates the OpenAI Responses API. The configured default is `gpt-4.1-mini`, changeable in the server environment. It can use selected note excerpts, reference supplied page/section labels, explain code and generate practice quizzes. Provider credentials belong on the server only.

The default allowance is one successful free request and 60 requests per paid period, with configurable limits and a daily server cap. These are application defaults, not a confirmed profitable pricing model. AI provider costs, latency and real-world teaching quality still need validation. Tutor transcripts are not retained by the GradePath server.

### Plus subscriptions

Paystack integration includes checkout initialization, server verification, a monthly NGN ₦1,000 plan, signature-checked webhooks, renewal handling and a subscription-management link. Test and live access are kept separate. Provider keys and a real plan must be configured, then the full test checkout, renewal, cancellation and failure flows validated before charging students.

### Peer comparison

The optional backend supports opt-in comparisons within matching school, programme, level, scale, grade-point and retake-policy groups. It requires at least 25 participants and handles ties conservatively. These are self-reported cohort results. **Do not describe them as a verified national ranking or “top 1% in Nigeria.”** A national claim requires representative, comparable and verified data.

## Design direction to preserve

- Navy/near-black structure, blue University accents, burgundy/pink Secondary accents; no green-led theme.
- Self-hosted Sora headings and Inter body text, with their SIL Open Font License files bundled.
- Clear hierarchy, useful empty states and readable forms. Avoid inflated marketing metrics or fake activity.
- Motion should communicate mode changes, interaction feedback and navigation. Respect reduced motion; essential content must remain accessible without animations.
- Keep mobile navigation usable, controls labelled, focus visible, and financial/academic claims accurate.

## Architecture and editing map

| File | Responsibility |
| --- | --- |
| `index.html` | Semantic markup, navigation, forms and feature panels |
| `styles.css` | Theme tokens, layout, typography, responsive rules and motion |
| `appearance.js` | Early saved-theme application to reduce a theme flash |
| `experience.js` | Theme control, mobile navigation, reveals and scroll feedback |
| `core.js` | Pure calculations, validation, state normalization and backup migration |
| `app.js` | Shared UI helpers, local state, routes, mode switch and overview |
| `grades.js` / `school.js` | University and secondary result workflows |
| `study.js` / `exams.js` / `lab.js` | Planning/notes, exam preparation, practice and coding workflows |
| `catalog.js` | Resource links, original questions and coding lessons |
| `online.js` | Account, tutor, subscription and benchmark browser interfaces |
| `server.mjs` / `server/` | Optional Node HTTP service, SQLite store, AI and billing |
| `scripts/build.mjs` | Explicit public asset allowlist and `dist/` generation |
| `vercel.json` | Static build, status rewrite and response headers |
| `test/` | Node tests for calculations, mode data and backend flows |
| `vendor/` | Bundled PDF.js and font assets with licenses |

The frontend uses hash routes and no package dependencies. The optional server requires Node 24 or newer and uses built-in SQLite support. This is not a Next.js app.

### Run and validate

For the simplest preview, extract the ZIP and open `index.html`. For PDF import and optional server features, install Node 24+, run `npm start` in the folder, and open `http://localhost:3000`. Windows users can double-click `START-WINDOWS.cmd`.

```sh
npm test
npm run build
```

Copy `.env.example` to `.env` only when configuring the local backend. Never commit secrets. Browser storage differs between file URLs, localhost and production: export/import a backup when moving between them.

## Deployment details

- Vercel team slug: `favour12`.
- Existing project: `gradepath` (`prj_Cll2LzDgAMCwA9yWiyVPbdmgNJGP`).
- Verified production deployment: `dpl_Fz6EnZ9JZDB9UjSvMH9zRYKv1fQD`, status READY.
- Canonical public URL: https://gradepath-theta.vercel.app/
- Framework: none; build command `npm run build`; output directory `dist`.
- `/api/status` is rewritten to a static status response reporting online services disabled. Public account/AI/checkout controls reflect that state.
- Server files, tests, database contents and environment secrets are excluded from the static asset output.
- The current production deployment was uploaded directly. Once a repository exists, push the source and link it to this existing Vercel project for subsequent deployments.

Do not assume that uploading the Node server to this static project enables accounts. SQLite requires durable storage and an appropriate runtime. Either host the Node backend on a persistent server or migrate storage and endpoints to an architecture suitable for the chosen hosting platform.

## Verification completed

- Eight Node tests passed, including the backend integration test suite with simulated provider responses.
- Syntax and static markup checks passed; the static build completed with its public-file allowlist.
- Browser exercise: university sample CGPA 4.33 stayed intact while Secondary saved English 80 and Mathematics 60 as 70.0%; switching back and reloading retained data and selected mode.
- The JAMB mock example of 275/400 and its four subjects remained intact.
- Desktop light and dark themes were visually reviewed. A narrow browser viewport equivalent to approximately 340 CSS pixels had no horizontal overflow; navigation and school inputs remained usable. This is not a substitute for physical Android/iPhone testing.
- The public Vercel production site opened successfully after deployment.
- OpenAI and Paystack were tested with mocks, not real provider credentials or live charges.

## Next work, in priority order

1. **Finish GitHub publishing.** Create an empty repository under `codeWithGojo`, push this source, then connect it to the existing `gradepath` Vercel project. Preserve all current features and do not commit `.env`, data, logs or generated dependencies.
2. **Host durable accounts and data.** Choose the backend deployment strategy, add cloud sync and ownership rules for study data, then implement email verification, password reset, backups and deletion. Keep student data private by default.
3. **Enable the tutor deliberately.** Add server-side credentials, verify grounding and code teaching with real requests, test quotas and failure states, and measure costs before committing to ₦1,000/month allowances.
4. **Validate payments in test mode.** Test checkout, repeat webhooks, renewals, cancellation, failed payment and subscription-management flows on the hosted backend. Enable live payments only after those work.
5. **Expand educational content.** Add expert-reviewed secondary curricula, institution-specific grading presets, more coding lessons, licensed or original exam questions and relevant learning resources. Add OCR only if needed and with explicit upload/privacy limits.
6. **Deepen learning insights.** Topic-level performance, stronger adaptive practice, configurable study targets and a transparent recommendation rationale. Keep secondary marks separate from university CGPA.
7. **Build credible rankings.** Start with clearly labelled opt-in cohorts. Do not publish national percentile claims without defensible data and methodology.
8. **Prepare a public paid launch.** Test actual mobile devices, keyboard and screen-reader flows; add error monitoring, operational rate limits, privacy and subscription terms, export/deletion tools and age-appropriate data handling for secondary-school users.

## Suggested instruction for Claude

> Continue GradePath from the attached source. Inspect the existing code before editing. Preserve both school modes, existing backup migration, the navy/blue/burgundy/pink design and reduced-motion support. Start by finishing GitHub connection and deciding a durable backend strategy. Clearly distinguish browser-local features from services that are actually hosted. Do not claim AI, payments, cloud sync or national rankings are live until they have been implemented and verified. Run the existing tests and check mobile layouts after material UI changes.
