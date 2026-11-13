# GradePath

GradePath is a study workspace for university and secondary-school students. The website is plain HTML, CSS, and JavaScript, so you can edit it directly in VS Code.

**Live site:** https://gradepath-theta.vercel.app/

Version 3 adds separate **University** and **Secondary** modes. Switch modes in the sidebar; your choice is remembered, and neither mode overwrites the other's results. University mode uses weighted GPA/CGPA. Secondary mode uses subject marks and term averages for JSS 1–SS 3, with a separate WAEC, NECO and JAMB preparation page. Study Room, Practice and Coding Lab are shared.

The interface includes blue/navy university styling, burgundy/pink secondary styling, light and dark themes, animated controls, section reveals, a scroll indicator and a mobile menu. Motion is reduced when the device requests it. Sora and Inter fonts are bundled locally under their SIL Open Font Licenses in `vendor/fonts/`.

### What is live

The public Vercel site is a static study workspace. Its calculators, school results, study planning, practice, Coding Lab and backups work in the browser. **Accounts, cloud sync, AI tutoring, paid checkout and peer benchmarks are not enabled on this deployment.** The account page clearly shows these limits, and no payment is taken. The optional Node backend below is included in the source for further development.

Read `CLAUDE_HANDOFF.md` for the current capabilities, deployment details, verification results and remaining work.

## Start on Windows

1. Right-click `GradePath.zip` and choose **Extract All**.
2. Open the extracted **GradePath** folder and double-click **index.html**. Edge or Chrome will open the app.
3. To change the code, open VS Code, choose **File → Open Folder**, and pick the extracted **GradePath** folder. After each edit, save with **Ctrl+S** and refresh your browser.

Grades, subject insights, exam mock plans, study materials, pasted/TXT/Markdown notes, practice, and the Coding Lab work in the local workspace. The server mode below also supports importing selectable text from PDFs. Built-in exercises work without a connection. External resource links need internet access.

### Try a few things

- **Grades & targets** → **Try an example** → **Calculate GPA**. The 5.0 defaults give **4.33**. Save the example to see a CGPA and subject breakdown.
- **Preview CGPA** uses the current draft, including a retake if the code and grading settings match. Use **Graduation target** to compare different future GPAs.
- Switch to **Secondary** → **School results**. Save English at 80 and Mathematics at 60 to see a **70.0%** term average. Add another term to compare progress. These are equal-weight school marks and personal targets, not official examination grades.
- **Study Room** → add a course, a topic, and your confidence. Then choose **Suggest sessions** to add revision sessions to your weekly plan.
- **Secondary** → **Exam preparation** → choose WAEC, NECO or JAMB, enter your subjects and practice marks, and start a timed practice set. For JAMB, marks of 80, 70, 60, and 65 give a mock total of **275/400**. Choose your subject combination from [JAMB IBASS](https://ibass.jamb.gov.ng/). The built-in questions are original practice, and mock marks are planning estimates.
- **Coding Lab** → select a lesson, edit its starter code, then click **Run checks**. Use the hints or try the worked solution. HTML previews are inert and JavaScript checks run in a separate, time-limited browser worker.
- Use **Export study data** before moving the project or switching browsers. Use **Import a backup** to restore it. A backup can contain your grades, notes, and code. Keep it private. A GradePath v1 JSON backup can also be imported.

## Start the local server

The optional server contains accounts, opt-in peer benchmarks, AI tutoring, and subscription checkout. AI and payments require your own provider configuration. Core study data is still stored in your browser, even after signing in; this version does not sync notes or grades between devices. Your account and any benchmark you choose to share are stored in the server's SQLite database. PDF text import works on localhost and the hosted HTTPS site.

1. Install [Node.js 24 LTS or later](https://nodejs.org/en/download) using the Windows installer.
2. Double-click **START-WINDOWS.cmd** and leave its window open.
3. Visit [http://localhost:3000](http://localhost:3000). To start it from VS Code instead, open a terminal in the project folder and run `node server.mjs`. There are no npm packages to install.
4. If you used the file directly, export your data there and import it on localhost. The browser treats the two addresses as different workspaces.

If port 3000 is already in use, run `node server.mjs --port 3001` and open `http://localhost:3001`. Keep using the same address when you return. To stop the server, press **Ctrl+C** in its terminal.

**PDFs:** The browser extracts selectable text locally. Up to 30 pages per PDF are read, and long pages are capped. For image-only scans, paste or upload a text transcription. The included PDF.js files are licensed under Apache 2.0. See `vendor/PDFJS-LICENSE.txt`.

### Turn on the AI tutor

1. In VS Code, copy **.env.example** to **.env** in the GradePath folder.
2. Set `OPENAI_API_KEY` to your OpenAI API key. The default model is `gpt-4.1-mini`. You can change it with `OPENAI_MODEL` to a model on your account that supports structured output.
3. Restart the server, open **Account & Plus**, create an account, and try the tutor.

The free trial allows one successful request per account. The default Plus allowance is 60 requests per paid period, configurable in `.env` with `AI_PLUS_LIMIT`. `AI_DAILY_LIMIT` caps attempts across your server. The tutor sends the question and any included code or relevant note excerpts to OpenAI. It can reference the supplied pages or sections and save generated quizzes to Practice. The GradePath server does not keep tutor transcripts.

Keep provider keys in `.env`. Never place them in an HTML or JavaScript file served to the browser. [OpenAI Responses API documentation](https://developers.openai.com/api/reference/resources/responses/methods/create)

### Turn on GradePath Plus

1. In your Paystack **test** dashboard, create a **monthly NGN ₦1,000** plan.
2. In `.env`, set `PAYSTACK_MODE=test`, `PAYSTACK_SECRET_KEY` to your test secret, and `PAYSTACK_PLAN_CODE` to the test plan code.
3. Restart the server. Sign in to GradePath and use **Open test checkout**. After checkout, GradePath verifies the payment from the server before enabling access.
4. To receive recurring payment events, host this Node app at an HTTPS address and set `PUBLIC_URL` to that origin. Point the Paystack webhook URL to `https://YOUR-DOMAIN/api/webhooks/paystack`. Verify the subscription, renewal, and manage-link flows in test mode before switching to your live key and live plan.

The app verifies the plan amount, payment currency and ownership, and webhook signature. Subscription access follows verified payments. **Manage subscription** opens Paystack's hosted management page. Paystack test access and live access are kept apart. No provider account, keys, or live checkout are included in this download. [Paystack subscription documentation](https://paystack.com/docs/payments/subscriptions/)

For a hosted pilot, run one Node instance with a persistent `DATA_DIR` behind your HTTPS reverse proxy. Back up the SQLite data directory. The included account flow uses email and password. Email verification and password recovery would need to be added before a broad public launch. The optional `SIGNUP_INVITE_CODE` lets you restrict new accounts during a pilot.

### Peer benchmarks

Students opt in from **Account & Plus**. The comparison matches school, programme, level, scale, grade points, and retake policy. It reports a rank once at least 25 students have joined that group. Ties are included conservatively in the top-percent figure. These are self-reported GradePath cohort results. A verified national ranking would need its own representative data.

### Official exam resources

- [WAEC e-Learning](https://waeconline.org.ng/e-learning/) for subject guidance and examiner reports.
- [NECO SSCE Internal](https://neco.gov.ng/exams/ssce-internal) for official exam information.
- [JAMB IBASS](https://ibass.jamb.gov.ng/) for syllabuses and subject combinations.

### Where to edit

| File | What to change |
|---|---|
| `index.html` | Page headings, forms, and navigation |
| `styles.css` | Colours, typography, spacing, and mobile layout |
| `catalog.js` | Resources, practice questions, hints, and Coding Lab lessons |
| `core.js` | Grade rules, data format, mock scores, and calculations |
| `app.js` | Mode switching, dashboard, navigation, and local storage |
| `grades.js`, `school.js`, `study.js`, `exams.js`, `lab.js` | Features on each study page |
| `appearance.js`, `experience.js` | Saved theme, motion, scroll effects, and mobile navigation |
| `online.js`, `server.mjs`, `server/` | Accounts, tutor, benchmarks, and billing |
| `scripts/build.mjs`, `vercel.json` | Static production build and Vercel settings |

Run `npm test` with Node installed to check calculations, retake handling, benchmark rules, and server flows. The tests simulate OpenAI and Paystack responses and make no live requests.

## Deploy the browser workspace

Run `npm run build` to create `dist/`. The build uses an explicit public-file list, so server code, tests, data and secrets are excluded. Vercel reads the supplied configuration and serves that directory. The `/api/status` route reports that online services are disabled.

The current production project is named `gradepath` on Vercel. Its GitHub repository is not connected yet. Once an empty repository is created under `codeWithGojo`, push these source files and connect that repository to the existing Vercel project. Do not create a second production project unnecessarily.

Deploying this static build does not deploy the SQLite backend. For hosted accounts and payments, first choose durable server hosting or migrate the backend to a managed database and suitable server functions.
