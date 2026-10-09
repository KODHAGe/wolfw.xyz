# Gap register — wolfw.xyz

The explicit unknown register. This file is the honesty mechanism for Study 1:
there is no ground truth for completeness when reverse-engineering a live system,
so completeness is not claimed. What is claimed is that every hole is named.

Status: draft · Zone: **GAPS** (unknown — must not be silently invented)

Each gap records what is unknown, how it was detected, what it would cost to
close, and whether a rebuild must decide it.

---

## G1 — The Sanity schema is inferred, never seen

**Unknown.** Everything in R1.2 is reconstructed from the GraphQL *queries*, not
from the schema. Actual field types, validation rules, slug generation,
ordering, drafts, and the full field list of `sanityProjectWolf` and
`sanityAuthor` are all unverified. Fields present in the CMS but not queried by
the code are invisible here.

**Detected by.** `gatsby-config.js:28-41` configures the source; the schema
itself is never fetched. No schema file exists in the repo.

**Cost to close.** Read access to Sanity project `5re0s6iv` (dataset `prod`) and
export the schema.

**Rebuild must decide.** Whether the rebuild keeps Sanity as the CMS, and if so
whether to pin the schema version so future editorial changes cannot break the
build.

---

## G2 — Live build may not correspond to `master` — **RESOLVED**

**Resolution (2026-10-09).** The live site and `master` agree.

- Last commit on `master`: `2022-03-23` ("slight cv updates")
- Live deployment `last-modified`: `2026-10-03 07:58:59 GMT`
- Served headers: `server: Vercel`, `x-vercel-cache: HIT`, `content-length: 10831`
  for `/` — matching the local build

The 2026-10-03 date is a **redeployment of code last changed in March 2022**,
not a divergence. The repository has been frozen for roughly four and a half
years and the live site reflects exactly that source.

**Consequence.** "Current behaviour" is now well-defined and stable, which is
good for Study 1 — the recovered zone describes a system that has not moved.
But it also means the site has had no maintenance in four years, so defects
have had four years to accumulate unfixed. Expect more of them than the diff
suggests.

---

## G3 — Project body content — **RESOLVED**

**Resolution (2026-10-09).** All 18 project bodies recovered from the live
deployment. Extraction script and raw output preserved in
`extract/live-projects.json` and `extract/live/`.

- 12 work projects, 6 art projects, slug-for-slug identical to the live site
- Bodies, titles, Sanity image URLs and per-project video flags captured
- `Tech:` trailer lines preserved as a labelled field

Written to `rebuild/src/content/projects/*.md`. The rebuild now carries the
site's actual portfolio content rather than placeholders — 23 static pages, up
from 11.

**Still partly open:** `publishedAt` was not recoverable from the rendered page
(it only ever appeared as a sort key in the listing query), so dates are set to a
placeholder and need the Sanity export (G1) to resolve properly.

---

## G4 — CSS is specified only as structure, not as rules

**Unknown.** 285 lines across 9 stylesheets have not been specified. What *is*
known: `layout.css` is 142 lines with 22 top-level selectors, and it contains a
`@media screen and (max-width: 600px)` breakpoint plus `@page` and
`@media print` blocks. Specific values — colours, spacing scale, type scale,
breakpoint behaviour — are unrecorded.

**Detected by.** `extract/pass-a.sh` inventories stylesheets by size but not by
rule. Selector extraction shows the shape, not the values.

**Cost to close.** Full read of 285 lines. Cheap in effort, high in value — CSS
is the single largest unspec'd surface in the recovered zone.

**Rebuild must decide.** Whether to extract design tokens (Study 3 needs them
for animation work anyway) or to carry the CSS across and re-derive later.

---

## G5 — `_rawBio` is queried but never rendered

**Unknown.** `about.js:28` requests `_rawBio`. No component in the repo consumes
it. Either the query is dead surface, or the live `/about` renders bio content
from somewhere not visible in this repo.

**Detected by.** No read of `data.sanityAuthor._rawBio` anywhere in `src/`.

**Cost to close.** Inspect the live `/about` payload.

**Rebuild must decide.** Whether `/about` should have a bio at all. Currently it
renders image, caption, and the facts widget — and no prose.

---

## G6 — `?secret=` query-parameter access is unconfirmed

**Unknown.** `utils.js:14-17` defines `getQueryPassword`, parsing `?secret=` from
the URL. Nothing in the repo calls it. Whether the installed theme plugin
consumes it — which would make any gated page reachable via a URL parameter —
is unknown.

**Detected by.** `grep -rl getQueryPassword src/` returns only its definition.

**Cost to close.** Read the installed theme source in `node_modules`, or test
the live site with a `?secret=` value.

**Severity: lowered.** Since the gate is a UX affordance and the content is
public in the bundle regardless (R5.7), URL-parameter access is not a
confidentiality hole. It *is* a UX question: does a shared link bypass the
prompt for a legitimate recipient?

**Rebuild must decide.** Whether link-based access exists. If it does, keep it
deliberately; it is genuinely useful for sending someone straight to the CV.


---

## G7 — Responsive behaviour is inferred from one breakpoint

**Unknown.** One `@media screen and (max-width: 600px)` block exists. What it
changes, and whether any layout reflows by other means (flexbox, viewport units
in the SVG background), is unverified against real viewports.

**Detected by.** Selector scan of `layout.css`.

**Cost to close.** Render `/`, `/work`, `/cv` at 3–4 widths and diff. Cheap.

---

## G8 — No test suite, so no parity ground truth

**Unknown.** `package.json:40` defines `test` as the Gatsby starter stub that
exits 1. There are no unit, integration, or snapshot tests. Nothing in the repo
can tell us whether a rebuild reproduces current behaviour.

**Detected by.** No test files; no test framework in dependencies.

**Cost to close.** This gap is only closable *by* the study — see
`behavior.feature` and `PLAN.md` Study 1 metrics. It is the reason behavioural
scenarios are specified against the live site rather than against a suite.

**Rebuild must decide.** Whether the rebuild gets a test suite. It should; the
absence of one is why this gap exists.

---

## G9 — Accessibility is not audited

**Unknown.** Grep finds exactly two ARIA annotations (`index.js:24`, `cv.js:24`),
both on decorative emoji. There is no audit of contrast, focus order, keyboard
navigation, heading hierarchy, or whether the SVG background is announced.

**Detected by.** `grep -rn 'aria-\|role=' src/` — 2 hits, both `role="img"`.

**Cost to close.** Run an automated audit (axe or equivalent) plus keyboard
walkthrough. Cheap.

**Rebuild must decide.** The recovered zone carries a11y forward as-is, which
means carrying forward the gaps in it too. Study 3's animation work adds more
(a `prefers-reduced-motion` obligation that the current site does not meet).

---

## G10 — Print stylesheet contents unspecified

**Unknown.** `@page` and `@media print` blocks exist in `layout.css`, and
`cv.js:24` offers a print button. What the printed CV actually looks like — which
elements are hidden, page breaks, whether the background SVG is suppressed — is
unrecorded.

**Detected by.** Selector scan found both at-rules; contents not read.

**Cost to close.** Read 20 lines and render-to-PDF once. Trivial effort,
non-trivial value — the CV is a document people actually print.

---

## G11 — Analytics history is unrecoverable

**Unknown.** `gatsby-plugin-google-analytics` targets `UA-245054-12`. Universal
Analytics stopped processing data in 2024, so whatever the site accumulated is
gone and no record of it survives in the repo. What the traffic profile was, and
therefore which pages matter, cannot be answered from the code.

**Detected by.** `gatsby-config.js:9-17`. UA property, obsolete ID scheme.

**Cost to close.** Not closable. Historical analytics data is external and,
for this property, likely already purged.

**Rebuild must decide.** Whether analytics are wanted at all, and if so with
what. Do not carry forward a dead property.
