# Landing page section map

The public landing page lives in `index.html` between `LANDING PAGE` and `END LANDING PAGE`.
Each section is self-contained:

- **Markup**: wrapped in `<!-- ===== SECTION START: id ===== -->` / `<!-- ===== SECTION END: id ===== -->`.
- **Styles**: one block in `landing.css` headed `/* ---------- id ---------- */`, in page order.
- **Behaviour**: only the sections listed below use `landing.js`, and each hook is keyed by a data attribute, so removing a section never breaks another.

Copy stays in the HTML (not a JavaScript data file) so search engines and link previews can read it without running scripts.

| # | id | Purpose | Background | JS hooks |
|---|----|---------|------------|----------|
| 1 | `lp-hero` | Core promise, primary CTA, illustration, four fact chips | Black | `#study-art` canvas, `[data-magnetic]`, `[data-create-account]` |
| 2 | `lp-paths` | University vs Secondary orientation; buttons set the mode | Paper | `[data-enter]` |
| 3 | `lp-grades` | GPA/CGPA, preview, targets; preview reproduces the built-in sample (4.33) | Black | `[data-enter]` |
| 4 | `lp-study` | Study Room → suggestions → weekly plan → calendar | Paper | none |
| 5 | `lp-practice` | Practice counts (48 questions, 8 subjects, 4 lessons) and Coding Lab preview | Black | none |
| 6 | `lp-pal` | Study Pal abilities and limits, with a live status line | Paper | `#lp-pal-status` reads `/api/status` |
| 7 | `lp-nigeria` | Nigerian History teaser, era strip, language roadmap note | Black + burgundy glow | `[data-reveal]` river drawing |
| 8 | `lp-engineering` | Formula library preview with a Secondary/University toggle | Paper | `[data-lp-level]`, `[data-lp-card]` |
| 9 | `lp-start` | Three steps and final CTA | Red | `[data-magnetic]` |
| 10 | `lp-footer` | Product, learning, official resources, account links | Black | `[data-lp-top]` |

Header (`lp-header`) links use `data-lp-scroll="<section id>"`. Remove the matching link if you remove a section.

## Rules for editing

- **Replace a section**: swap the markup between its START/END comments and its block in `landing.css`. Keep the `lp-section` class and a unique `id`.
- **Reorder**: move the markup block. Backgrounds are set per section, so check the black/paper rhythm still alternates.
- **Remove**: delete the markup, its CSS block and any header link that points to it.
- **Add**: copy an existing section of the same background as a template. Add `data-reveal` to elements that should fade in.
- **Keep claims true**: numbers on this page are counts of real content. Update them when `catalog.js` or `learn-content.js` changes. Don't add user counts, outcomes or endorsements.
- Don't use `href="#something"` for in-page links. Hash URLs are app routes; use `data-lp-scroll`.
