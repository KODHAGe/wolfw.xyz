# Desired requirements — wolfw.xyz

Status: draft · Zone: **DESIRED** (improvements — not current behaviour)

Kept separate from `recovered.md` so that "parity achieved" and "we changed
things" stay distinguishable. Everything here is a decision, not a finding.

Two axes of provenance are tracked per requirement:

- **Origin** — `owner` (stated by the site owner) / `derived` (follows from a
  recovered defect or a Study 1 finding) / `study` (follows from Study 2 or 3).
- **Decision** — `open` (needs a call) / `proposed` (recommendation on record).

---

## D1 — Content architecture

### D1.1 Move all content from Sanity into the repository

**Origin:** owner · **Decision:** proposed

The site uses a hosted CMS for 18 project documents and hardcodes the CV in
JSX. That is backwards: projects rarely change, while the CV — the point of the
site — requires a developer and a rebuild to change.

Move to files in the repository:

- one Markdown file per project, frontmatter carrying the fields
  `content-model.md` specifies
- CV and facts as structured data, not JSX

**Rationale beyond tidiness.** The publish path is currently invisible: there is
no CI config and no webhook configuration anywhere in the repository, so a
Sanity edit only reaches production via a dashboard-configured webhook that
cannot be seen from the source. Git-based content makes the platform's Git
integration the *complete* deploy story — one visible mechanism instead of two,
one of them hidden.

**Removes:** `gatsby-source-sanity`, `@sanity/block-content-to-react`,
`sanity-mux-player`, and a third-party account.

**Note.** Mux is a separate dependency from Sanity; only the CMS half is in
scope here. Video handling is D3.

### D1.2 Rich text becomes Markdown

**Origin:** derived · **Decision:** proposed

Portable Text → Markdown across 18 documents. Mechanical for this corpus.

**Known cost.** Images inside bodies are currently handled by
`@sanity/block-content-to-react` with `imageOptions: {w: 640, fit: 'max'}`
(`projectPage.js:34-37`). Markdown requires deciding where those images live and
how responsive variants are produced. Currently answered by Sanity's image CDN.
Not yet resolved — see `gaps.md#G4` for the wider CSS/asset question.

### D1.3 Sanity is decommissioned

**Origin:** owner · **Decision:** proposed

**Not a cost decision.** The free plan covers this site many times over —
10k documents against ~20, 250k API requests/month against roughly a dozen per
build, since the site is queried at build time only. It will never cost money.
The case is operational surface and coupling, not spend.

Exit sequence: export the dataset, convert, verify project-for-project against
`behavior.feature`, then cancel.

---

## D2 — Deployment

### D2.1 Migrate off Gatsby 2 — **Astro**

**Origin:** derived + owner · **Decision:** proposed

Gatsby 2 is 2019-era, on React 16, with a build pipeline slow enough to consume
meaningful free-tier build minutes. The repository has been frozen since
**March 2022** — the live site is a redeployment of four-and-a-half-year-old code
(see `gaps.md#G2`). Vercel serves it reliably and will keep doing so. The
framework is the risk, not the host.

Gatsby does three jobs here that a replacement must cover separately: file-based
routing, a build-time data layer, and image optimisation.

**Why Astro.** Islands architecture is the direct fit for D4's shape: static
HTML by default, `client:*` directives opting individual components into JS.
This site is ~95% conventional HTML with exactly two interactive elements — the
facts widget (`R7`) and the password gate (`R5`). Both become islands;
everything else ships zero JS.

Astro's **content collections** are schema-validated, which answers two open
items at once: they give the CV a proper home as structured data instead of JSX
(D1.1), and they make the 285 unspec'd lines of CSS (`gaps.md#G4`) specifiable as
tokens rather than a transcription chore.

Astro also has built-in `prefers-reduced-motion` handling in its view
transitions, which satisfies D4.4 without hand-rolling it.

**Known limitation, accepted.** Astro's islands operate page-by-page, so shared
state across routes and layout persistence during navigation are harder than in
Next.js. For a portfolio with one interactive widget per page this is a non-issue.
It would be a real problem for an application — recorded so the choice is not
mismade if the site's scope grows.

### D2.2 Keep Vercel

**Origin:** owner · **Decision:** proposed

Static + free is correct for this traffic profile. 100GB bandwidth free against
effectively zero usage. The platform stack being free is a real benefit and
nothing in this study argues against it.

### D2.3 Delete `now.json`

**Origin:** derived · **Decision:** proposed

Vestigial. It sets `NOT_VERY_SECRET`, which nothing reads; the code expects
`GATSBY_NO_SECRET` (`recovered.md#R5.5`). Vercel would source that from project
environment variables regardless.

### D2.4 Remove dead analytics

**Origin:** derived · **Decision:** proposed

`gatsby-plugin-google-analytics` targets `UA-245054-12` (`gatsby-config.js:9-17`).
Universal Analytics stopped processing data in 2024. This emits nothing. Either
add a working replacement or delete it — carrying it forward is not an option.

---

## D3 — Gating and privacy

### D3.1 The CV gate stays, and its guarantee is stated honestly

**Origin:** owner · **Decision:** proposed

Confirmed intent: the gate is a **UX affordance**, not a confidentiality
control. The CV is not sensitive.

A rebuild reproduces the *mechanism* — prompt, cookie, reload, back-out links —
and must **not** claim a guarantee the original never made. The honest claim is
"not rendered without a password", never "not readable" (see `recovered.md#R5.7`
for the bundle verification).

### D3.2 Fix the password configuration

**Origin:** derived · **Decision:** proposed

The mechanism is intended; the broken env var name is not. With
`GATSBY_NO_SECRET` unset the gate blocks **everyone** permanently, which defeats
the purpose it exists to serve.

### D3.3 Non-public client projects — content-side hiding, with a build guard

**Origin:** owner · **Decision:** open

Future direction, explicitly not critical now. A future development would add
non-public projects with hidden client names, hidden by withholding the content.

**Content-side hiding is the right mechanism** — an unpublished document simply
does not exist to the build, so nothing leaks. But on a static build it fails
*silently*: a document published by mistake is baked into public output with no
error and no signal.

**Required guard.** If a `private: true` flag exists on any project document, the
build fails. This is the entire difference between "hiding" and "believing you
are hiding".

**The transition point, stated plainly.** Client names live in the *content*, not
just the page. UX-grade obscurity is sufficient for a CV whose contents are
already public, and insufficient the moment a real client name is involved. If
that day comes, the mechanism has to change — either the content never enters
the public build (separate repo or private path), or the deployment itself sits
behind real authentication. Worth revisiting then rather than now.

### D3.4 Stale protected path

**Origin:** derived · **Decision:** proposed

`/agency-work` is in `pagePaths` (`gatsby-config.js:24`) but exists in neither
the repository nor the live site. `listItem.js:23` marks any project whose title
contains "agency" with a lock, so the route likely existed and was removed. Drop
the entry unless the content returns.

---

## D4 — Study 3: visual and interaction work

### D4.1 Target: **RESOLVED**

**Origin:** owner, 2026-10-09 · **Decision:** resolved

The requirement is **interactive, GPU-accelerated, dreamy** animation. Owner
enumeration, in priority order:

1. **Background** — first target, migrate to GPU
2. **Buttons** — current hover/press animations improved
3. **Page transitions** — "beautiful" between pages
4. **Loading and project viewing** — "prettier"
5. **Animated graphics replacing static images** — possible future work

**The finding that shapes everything below.** None of these is *stateful vector
illustration*. All of it is shader-shaped work. Rive is a **vector graphics
renderer** — bones, IK, mesh deformation, path interpolation. Its runtimes are
`@rive-app/webgl` and WASM; Adobe retired Animate in Feb 2026 and Rive's own
positioning is explicitly as the Animate replacement. Reaching for Rive to do
shaders means going around it entirely.

So Rive is demoted from "candidate" to **escape hatch for a requirement that does
not currently exist** (see D4.3).

### D4.2 Four layers, one GPU tier

| Layer | Job | Tool | Artifact type |
|---|---|---|---|
| Page | structure, content, routing | Astro | `.astro` + Markdown |
| Motion | transitions, reveals, parallax | CSS scroll-driven + View Transitions | CSS — in the repo |
| GPU | shaders, procedural background | WebGL2 + GLSL | **GLSL — text, diffable** |
| Vector motion | stateful 2D illustration | *only if D4.3 triggers* | asset, never spec |

The GPU layer is text. That is what satisfies the constraint inherited from the
migration work — artifacts must stay inspectable or spec-as-source is lost. GLSL
qualifies; `.riv` does not.

### D4.3 Rive: escape hatch, not a candidate

**Origin:** derived · **Decision:** escape hatch

Admissible only if a requirement emerges that is genuinely *stateful vector
motion* — an animated logo with real state transitions, a character responding
to hover. None of D4.1's five items is that.

If it is ever used, it is an **asset referenced from spec data, never a spec
artifact** — which is what the constraint has always said. `.riv` is proprietary
binary, dual-file (editable project plus compiled runtime), with no open
standard, and would be an opaque blob in a repository whose premise is
inspectable content.

**Lottie/dotLottie** occupies the same niche with an open format and is the
preferred fallback if that niche appears.

### D4.4 The background is a layer-4 citizen already

**Origin:** derived · **Decision:** proposed

`background.js` is 135 lines of JavaScript performing per-frame SVG DOM
mutation — `getBBox()`, `createElementNS`, `appendChild` — to produce seven
sine curves. That is a **CPU-bound software renderer emulating what one fragment
shader does on the GPU**.

Migrating it is therefore not *adding* capability. It is replacing an imitation
with the real thing, and it reduces the recovered background spec
(`recovered.md#R6`) from a distribution table of random parameters to a shader
whose visual output is exactly reproducible.

**In keeping with `R6`, specify it as behaviour with parameters, not as pixels:**
frequency, amplitude, offset, grid spacing, dash pattern, and the per-element
randomisation ranges from R6.1 become uniform values. The spec form survives the
change of implementation; only the renderer changes.

### D4.5 Buttons: current state is CSS-only, target is GPU

**Origin:** owner + derived · **Decision:** proposed

`layout.css` already carries `.button:hover` and `.button:active` — plain CSS
transitions. The improvement target is the *feel*: spring-based motion, a
gooey/metaball merge where buttons sit close together, subtle displacement on
approach.

**These are the canonical shader effects** — gooey merging and magnetic pull are
both well-established fragment-shader techniques. They are not vector-animation
problems, which is the second reason Rive does not fit here.

Implementation note: a gooey effect needs the moving elements rendered to a
layer so neighbouring elements can merge. Decide early whether that layer is
CSS/SVG (`filter: url(#gooey)` with `feGaussianBlur` + `feColorMatrix`, no JS)
or a WebGL pass. **Start with the SVG filter** — it is declarative, needs no
context, and degrades for free.

### D4.6 Page transitions

**Origin:** owner · **Decision:** proposed

View Transitions API, cross-browser as of 2025–26, with Astro's `<ClientRouter />`
providing fallback simulation for unsupported browsers and automatic
`prefers-reduced-motion` handling. Free win.

The "dreamy" ambition is where shader work may enter — a transition that distorts
or blurs between pages rather than cross-fading. **Defer.** Native View
Transitions cover the requirement adequately; a shader-based transition requires
capturing and processing page imagery and is a large cost for an uncertain gain.
Treat as a later experiment, not a commitment.

### D4.7 Loading and project viewing

**Origin:** owner · **Decision:** open

Unspecified beyond "prettier". Two distinct problems:

- **Loading** — a static site's loading states are navigation and progressive
  enhancement, not data fetching. Worth deciding whether a transition is even
  needed when pages are prerendered.
- **Project viewing** — see D4.8.

### D4.8 Animated graphics in place of static images

**Origin:** owner · **Decision:** open, possible later

Replacing project thumbnails and body images with animated graphics. Speculative
— the corpus is 18 projects with existing raster assets, and this is expensive
per item.

**Note on the spec consequence.** If project images become animated, the content
model changes shape: `mainImage` is currently a Sanity asset reference
(`content-model.md`) and becomes a multi-variant field. That is a `D1` change as
much as a `D4` one, and it is a reason to sequence this *after* the D1 content
migration rather than alongside it.

### D4.12 Readability over R6.5 — the content plate (2026-10-11)

**Origin:** owner ("Improve readability") + `design/visual-effects.md` §1 · **Decision:** accepted, shipped

R6.5 (`recovered.md#R6.5`) records that the legacy field draws at full opacity
over the heading and intro copy with no protection zone, and explicitly says a
legible version "is a desired change and belongs in `desired.md` — not a quiet
correction to recovered behaviour". This is that entry.

**The change.** The field stays full-bleed, full-alpha and untouched outside
the content column. The column (`main`) gains a frosted plate: 82 % white
composite + `backdrop-filter: blur(6px)`, opaque white under
`prefers-reduced-transparency`. Shader, alpha and dash behaviour are unchanged
(`u_alpha` is still 1.0) — the exclusion is a compositing decision in CSS, not a
change to the generative layer.

**Why a plate and not a shader mask.** DOM rects → shader uniforms would need
re-measuring on resize and on every client-router swap, and would put
legibility logic in GLSL where it cannot be tuned. The plate is one background
value on an element that already sits at z-index 1.

**Measured bound** (`design/audit/audit.mjs` B6, composited screenshot):
worst-case text contrast under the plate ≥ 13 : 1 with the field beneath it,
because the 82 % white composite over a black stroke has relative luminance
≈ 0.64. AA requires 4.5:1, AAA 7:1.

**Cost.** Zero GPU: no new context, no shader change, one compositor blur on a
640 px column.

### D4.13 The back link is sticky, not fixed (2026-10-12)

**Origin:** `design/frontend-architecture.md` §1.4 + measured evidence · **Decision:** accepted, shipped

R2.4 records `.backlink { position:fixed; left:2rem }`. Two measurements
against that:

1. A fixed element anchors to the **viewport** while the column is centred. At
   1440×900 the link sat at x=32 while the content it belongs to began at x=400.
2. D4.12's content plate uses `backdrop-filter` on `main`, which makes `main`
   the **containing block for fixed descendants** — so `left: 2rem` resolved
   against the 640px column and the link rendered on top of the project h1.
   Measured directly: with the plate blur on, `left=320`; with it off,
   `left=32`. Any future `filter`, `transform` or `contain` on `main` would
   have done the same thing silently.

`position: sticky` keeps the link attached to the column at every width and
visible during scroll. The below-600px "go static" rule existed only because the
link used to be fixed; it is gone. Focus order is unchanged (still the first
focusable on every subpage), and the sticky link carries a sheet-coloured chip
so content scrolling beneath it stays legible.

The fixed behaviour was itself the defect the architecture paper named, so this
is a correction rather than a regression — but it is a departure from R2.4 and
is registered here as R2.4 requires.

### D4.14 The field is instanced geometry, and its fallback is lazy (2026-10-13)

**Origin:** `design/visual-effects.md` §2.1–2.2 · **Decision:** accepted, shipped

R6's field was a fullscreen fragment shader evaluating every stroke at every
pixel: `O(pixels × strokes)`, measured at **0.49 % ink coverage for 5.58 ms of
GPU**. The cost model was the defect, not the shader. The shipping renderer draws
the curves as instanced triangle strips — one `drawArraysInstanced(TRIANGLE_STRIP,
0, 482, 70)`, geometry from `gl_VertexID`/`gl_InstanceID` alone, **zero vertex
bytes** — so the fragment stage only runs on pixels that carry ink.

Three decisions inside that, each with a measurement behind it:

1. **Tier B (the SDF quad) is dynamically imported.** The paper's tier list keeps
   it as a real fallback; compiling it eagerly cost **+2.9 KB gz on every page**
   and pushed `/about` and `/cv` past the 12 KB JS budget to guard a failure
   that has never happened. `background-sdf.ts` is now `import()`ed only if tier
   A fails to compile or link, and the CSS gradient (tier C) covers the gap. The
   harness fails if anyone makes it eager again (`B17-fallback-stays-lazy`).
2. **GLSL comments are stripped at build time** (`glslTrim` in
   `astro.config.mjs`). The shaders are documented inline, because the reasoning
   belongs next to the line it explains — 2,383 bytes of which were shipping to
   every visitor. Keeping the comments in source and dropping them in the build
   was strictly better than either deleting them or hitting the budget. Net
   result: `/home` is **9,707 B gz**, smaller than the 10,398 B it was before the
   rewrite, against a 12,288 B budget.
3. **The governor gives up the loop rather than the field.** When frames are
   genuinely late the renderer holds one static frame and sets
   `data-perf="static"`. Measured: at 20× CPU throttling the rAF interval is
   still 16.7 ms — nothing is late, so nothing happens, which is correct; at
   100× the interval breaks (max 100 ms) and the loop is dropped. Freezing a
   field the visitor is still watching at 60 fps would have been a regression
   dressed as a safeguard.

Re-measured on this machine rather than quoted from the paper: **0.14 ms/draw at
DPR 2, 0.07 ms at DPR 1**, against budgets of 2.0 ms and 1.0 ms, and a 3.21×
speedup over the SDF tier (paper: 3.6×). Ink coverage rose 1.30 % → **3.16 %**,
which is a correction rather than a regression: the SDF measured vertical
distance only and under-stroked steep sections, whereas SVG `stroke-width` is a
perpendicular width.

Two additions the paper declares as additions rather than recoveries: the sweep
head is coloured with a new token **`--c-field-hot`** (#bc89ff, the site's own
page purple — the field colours itself in and then settles to ink), and
pointer-driven amplitude swell. Both are off under reduced motion.

### D4.9 Reduced motion is a hard requirement

**Origin:** derived · **Decision:** proposed

Elevated from the earlier wording. The legacy site has one media query at 600px
and no motion handling (`gaps.md#G7`). D4 adds continuous background animation,
spring physics on buttons, and page transitions.

For a visitor with vestibular sensitivity, an always-animating full-viewport
shader is exactly the wrong thing to ship. Requirements:

- `prefers-reduced-motion` honoured everywhere, including the shader — render a
  **static** frame rather than simply a slower one
- no infinite animation without an opt-out
- Astro's built-in transition handling covers navigation; the GPU layer does not
  get that for free and must implement it explicitly

This belongs in the desired zone because the legacy site does not meet it. It is
not parity.

### D4.10 Design tokens

**Origin:** study · **Decision:** proposed

285 lines of CSS are unspec'd (`gaps.md#G4`), and every D4 effect needs
parameters to reference — easing curves, durations, blur radii, colour ramps.
Astro content collections give a natural home for them.

Extract tokens *before* writing shader code. Without them, shader uniform values
become magic numbers in a second, undocumented place — reproducing the exact
problem `content-model.md` found in the Sanity queries.

### D4.11 GPU context budget

**Origin:** derived · **Decision:** proposed

Browsers cap WebGL contexts per page (commonly 16; CanvasKit hits this in
practice). A design with a background shader, button effects, per-project
animations and transitions could plausibly exceed it — and the failure mode is
a black canvas, not an exception.

**Requirement:** one shared WebGL context for the whole page, with effects
composited into it. Not one context per effect. This is the main architectural
constraint on D4 and should be settled before implementation, not discovered
through debugging.

---

## D5 — Carried defects

Defects found in Study 1 that must be resolved one way or the other. All are
in `recovered.md` marked **(defect)**; none should be silently replicated.

| | Defect | Where | State |
|---|---|---|---|
| 1 | Facts widget divides by zero with one fact | `facts.js:20,44` | open |
| 2 | Facts widget mutates state array in place | `facts.js:17` | open |
| 3 | `/cv` password env var never matches | `gatsby-config.js:22`, `now.json:4` | D3.2 |
| 4 | `/agency-work` protected but nonexistent | `gatsby-config.js:24` | D3.4 |
| 5 | Dead UA analytics | `gatsby-config.js:9-17` | D2.4 |
| 6 | `header.js` never imported | — | proposed: delete |
| 7 | Empty `.contact` div renders nothing | `index.js:16-17` | proposed: delete |
| 8 | Listing queries request unused fields | `work.js:25-57` | resolved by D1.1 |

---

## Open questions blocking `desired.md`

Ordered by how much downstream work each unblocks.

1. ~~**D4.1 — what does "more advanced visuals" mean?**~~ **RESOLVED 2026-10-09.**
   Interactive GPU-accelerated work, background first, then buttons, page
   transitions, loading and project viewing, later animated images.
2. ~~**D2.1 — which framework replaces Gatsby 2?**~~ **RESOLVED: Astro**, with
   content collections answering the D1.1 and G4 items at the same time.
3. **D4.7 — what does "prettier loading and viewing" mean specifically?** The
   last undefined visual item. Loading may be a non-problem on a prerendered
   static site; project viewing needs a decision on whether card and detail-page
   treatments differ.
4. **D1.2 — where do body images live**, and how are responsive variants made?
   Currently answered by Sanity's image CDN. Interacts with D4.8, since animated
   project graphics change the shape of this field.
5. **D3.3 — does the private-project guard ship now or later?** Not critical
   today, but the guard is far cheaper to add alongside the content migration
   than to retrofit.

## Sequencing note

**Extract design tokens (D4.10) before writing any shader code.** Every effect in
D4 needs parameters to reference, and without tokens they become magic numbers
in a second undocumented place — exactly the duplication
`content-model.md` found in the Sanity queries, one layer up.

**Sequence the background (D4.4) before buttons (D4.5)**, as the owner ranked
them. It is also the lowest-risk: a single fullscreen quad establishes the shared
WebGL context that D4.11 requires, so D4.5 is then an additive effect on
infrastructure that is already proven rather than a parallel implementation.

**Defer D4.8 (animated project graphics) until after the D1 content migration.**
It changes the `mainImage` field shape, so doing it before D1.1 means
specifying the shape twice.
