# Accessibility & performance baseline — wolfw.xyz rebuild

**Audit date:** 2026-10-10 · **Auditor role:** accessibility & performance engineer
**Subject:** `rebuild/` (Astro 5, 25 built pages), built at audit time and served from `rebuild/dist`
**Method:** every number below was measured by `design/audit/audit.mjs` (re-runnable; see Part 4) or by the probe scripts beside it, run against the built site in Chrome 141 headless (ANGLE Metal, Apple M1 Pro). Line citations are to source. Nothing in this document is estimated.

**Scope note on the CV gate:** the audit builds with `PUBLIC_CV_PASSWORD=audit-dummy` so the *intended* gate state (form rendered) is exercised. The current deployment config has the variable unset, which renders the misconfiguration notice (`cv.astro:23`, `PasswordGate.astro:40-53`) — that branch shows none of the gate form failures below, but also means no visitor can ever see the CV. Both states are defects; the intended state's failures are the ones ranked here.

> **Update 2026-10-11 — Phase 0 shipped; this baseline has been superseded.**
> The findings below are the audit as it stood. The first build pass, taken from
> these findings plus the sibling design papers, landed and was re-measured by
> the same harness: **67 pass / 0 fail / 1 warn / 11 info, exit 0** (was 50 / 15
> / 3 / 11). Measured changes, not claimed ones:
>
> | Finding | Now |
> |---|---|
> | 1 gate unusable | **Fixed** — tokens resolve, input border 2px solid, announced error, block-spaced links, form wraps (B12/B3/B11 green) |
> | 2 reduced-motion toggle | **Fixed** — uniform re-uploaded and loop stopped/started in both directions; `start = 0` rewind replaced by freeze-at-current-frame so the toggle no longer jumps (B8/B14 green) |
> | 3 no `lang="fi"` | **Fixed** — schema field + 6 titles marked; bilingual titles mark only the Finnish half (S7 green) |
> | 4 body images `alt=""` | **Still open, needs the owner** — 41 of 41 still empty-alt. An `alt` field requires content only Wolf can write; nothing here may be invented. Status code: WARN |
> | 5 field over text | **Fixed by D4.12** — frosted content plate; measured worst composited contrast **8.1:1** (AAA) with the field full-alpha and untouched outside the column (B6 green) |
> | 6 font never loads | **Fixed** — `@font-face` declared, woff2 preloaded, mono fallback stack (S5 green; CLS 0.0000) |
> | 7, 8 target size / reflow | **Fixed** (B3, B11 green) |
> | 9 12.4 MB of images | **Converted** — 59 files → WebP, **12.4 MB → 2.0 MB**, 0/18 thumbnails over 150 KB (S8 green) |
> | 10 probe page ships | **Fixed** — moved out of `src/pages` (S11 green) |
> | 11 focus styles | **Fixed** — one global `a/input:focus-visible` rule (S10, B2 green) |
> | 12 forced-colors / prefers-contrast | **Fixed** — canvas hidden under both; CSS takes system colours (B15 green) |
> | 16 white on purple 2.57:1 | **Unchanged by design** — nothing renders that pair; kept as the standing design constraint |
>
> LCP improved 396–1920 ms → 492–508 ms. The one remaining WARN is the
> informational latent-purple constraint, and the one remaining owner-gated
> item is finding #4.

---

## Findings table (severity-ranked)

| # | Sev | Criterion | Finding | Evidence |
|---|-----|-----------|---------|----------|
| 1 | **Critical** | 1.4.11, 3.3.1, 4.1.3, 2.5.8, 1.4.10 | The CV gate form is unusable: the password input renders with **no border and no background** (six undefined custom properties), a wrong password produces **no perceivable or announced error** (value silently cleared), the submit button and gate links are under 24 px with 0 px spacing, and the form overflows 320 px viewports (scrollWidth 363 px) | measured: `border: 0px none`, `bg rgba(0,0,0,0)`; `PasswordGate.astro:91-98,134-138`; harness `B12-*`, `B3-target-size--cv-`, `B11-reflow`, axe `target-size` serious |
| 2 | **Critical** | D4.9 (spec) | Reduced-motion fails **both toggle directions** mid-session: preference ON does not freeze the field (`u_reduced` uploaded once at mount, never again — max 2.6 % of pixels still changing per 400 ms), preference OFF never starts the loop (field dead until reload) | `background.ts:293-299,353,392-394`; harness `B8`, `B14`; measured 0.000 % pixel change after OFF→ON |
| 3 | **High** | 3.1.2 (AA) | Bilingual site has **zero `lang="fi"` markup**: 7 built pages carry Finnish project titles (`Käkriäinen`, `Runokuu 2020`, `STT Tarkkailija`…) inside `lang="en"` documents; screen readers mispronounce them | `Layout.astro:37` (only `lang` in the codebase — grep `lang=` → 1 hit); harness `S7-lang-parts` |
| 4 | **High** | 1.1.1 (A) | **41 of 41 project body images render `alt=""`** across 16 of 18 project pages. These are the work itself (screenshots of the projects), not decoration. Listing thumbnails as empty-alt are defensible (the card's link text names the project); body images are not | `[slug].astro:62-71`; harness `S12`; images inspected, e.g. `public/images/projects/kaekriaeinen-2.png` |
| 5 | **High** | 1.4.3 (AA) | The field draws **over text at full opacity** (parity, R6.5) — measured worst case: **3.4 % of the intro paragraph's box** covered on desktop over 90 s, **5.4 %** at 360 px; ink-on-ink overlap = local contrast 1:1 where a stroke crosses a glyph | `background.ts:239-248` (`u_alpha` = 1.0, no falloff); harness `B6` + `coverage-long.mjs` |
| 6 | **High** | R8.2 / readability | **Necto Mono never loads.** No `@font-face` exists anywhere; the woff2/woff (56 KB) ship in `dist/fonts/` unreferenced and every page renders in generic sans-serif. The site's own typeface — the core of the "readability" brief — is absent | grep `font-face` in built CSS/HTML → 0 hits; `document.fonts` empty; `tokens.css:43`; harness `S5-font` |
| 7 | **High** | 2.5.8 (AA) | `/cv` gate links "back to the front page" (155×18 px) and "ask for access" (102×18 px) sit **0 px apart** — axe flags serious; fails the spacing exception. The back link elsewhere (64×19 px) passes only via the spacing exception (nearest target 232 px+) | harness `B3`, axe `target-size`; `PasswordGate.astro:71-74` |
| 8 | **Medium** | 1.4.10 (AA) | `/cv` reflows **363 px wide at a 320 px viewport** — the gate input's `min-width: 14rem` plus padding/gap in a non-wrapping flex row | harness `B11-reflow`; `PasswordGate.astro:84-98` |
| 9 | **Medium** | Perf / D1.2 | Image payload is **13.0 MB across 59 files**; thumbnails alone are 8.1 MB (16 of 18 over 150 KB; max 716 KB). `/work` ships 5.83 MB of thumbnails. WebP q80 re-encode measures **766 KB total (10.6×)**, 377 KB at display width (21.5×) | harness `S8`; `cwebp -q 80` conversions; `rebuild/public/images/thumbs/` |
| 10 | **Medium** | Build hygiene | `/probe/` — a dev-only shader debug page — **ships to production**, has no `lang`, and imports `/src/lib/background.ts` which 404s in the static build, so it is a permanently "running…" error screen | `probe.astro:24`; `curl /probe/` → import 404; harness `S11`, `S7-lang-page` |
| 11 | **Medium** | 2.4.7 / regression risk | Explicit `:focus-visible` styling exists **only** for `.button`. Back link, listing cards, text link and the password input rely entirely on UA default outlines — visible in Chrome today, but unconstrained by the design | `global.css:95-98`; harness `S10-focus-css` (missing: `.backlink .listlink .textlink input`) |
| 12 | **Medium** | D4.9 + 3rd-party | No `prefers-contrast` and no `forced-colors` handling anywhere. Under forced-colors the CSS adapts via UA forcing (button border → `rgb(0,0,159)`) but the **shader still draws black strokes** over the user's palette | grep `prefers-contrast\|forced-colors` in `rebuild/src/` → none; harness `B15` |
| 13 | **Low** | 2.4.3 | When the gate reveals the CV, focus **falls to `<body>`** — the focused submit button is removed from the DOM; a keyboard/SR user's next keystroke restarts from the top | `PasswordGate.astro:126-128`; harness `B13` |
| 14 | **Low** | Parity/consistency | The class `btn btn--solid` used by the facts button, gate submit and CV print button is **defined nowhere** — three interactive elements render unstyled (UA default), while `.button` carries the designed treatment | `Facts.astro:37,40`, `PasswordGate.astro:66`, `cv.astro:86`; grep `\.btn` in `rebuild/src/styles/` → 0 |
| 15 | **Info** | D3.1 (by design) | The CV ships in the page payload as claimed: 8,473 B of CV markup inside `<template id="cv-template">` in `dist/cv/index.html` (page 12,185 B raw / 4,616 B gz), and the password itself sits in the DOM as `data-password="…"`. The honest claim remains "not rendered", never "not readable" — confirmed still true after the migration | `cv.astro:43-90`; `PasswordGate.astro:55`; harness `S4-cv-bundle` |
| 16 | **Info** | 1.4.3 (latent) | White on `#bc89ff` measures **2.57:1** — below 3:1. No text uses that pair today (ink-on-purple is 8.16:1, ink-on-white 21:1:1), but it constrains the redesign: anything the redesign places on the purple frame must be ink | harness `B5`; `tokens.css:21-23` |

**Would this site pass a WCAG 2.2 AA audit today? No.** Findings 1, 3, 4, 7 and 8 are five independent AA (or A, for #4) failures on shipped pages; #1 alone fails four criteria on one page type.

---

## Part 1 — WCAG 2.2 AA audit with evidence

### 1.1 Contrast (1.4.3, 1.4.11)

Measured pairs (WCAG sRGB formula, harness `B5`):

| Pair | Ratio | Verdict |
|---|---|---|
| `--c-ink` #000 on `--c-sheet` #fff (all content) | **21.00:1** | Pass AAA |
| #000 on `--c-page` #bc89ff (text on the purple, if any) | **8.16:1** | Pass AAA |
| #fff on #bc89ff (latent — no current usage) | **2.57:1** | Fails 4.5:1 and 3:1; a redesign constraint, not a current failure |

**Text over the generated field.** The field strokes are pure ink at `u_alpha = 1.0` (`background.ts:248,352`) drawn on a canvas *behind* main (`Background.astro:34` z-index 0 vs `main` z-index 1) — but since main has no background, strokes show through wherever text doesn't paint over them, and where a stroke passes behind a glyph the glyph edge merges into the stroke: local contrast 1:1, the effective background of part of the text box. The field is dynamic, so the only honest measurement is sampling; the harness samples canvas frames with the text layer hidden and intersects the dark-pixel mask with every text node's client rects (`B6`, `coverage-long.mjs`):

| Viewport | Window | Worst text-box coverage | Victim |
|---|---|---|---|
| 1280×800 | 90 s, 60 samples | **3.4 %** | intro paragraph "Hi, I'm Wolf W…" |
| 360×740 | 20 s | **5.4 %** | the 🔒 glyph on the cv button |
| 1920×1080 | 20 s | 0.3 % | "get in touch" |
| 1280×800, /work/ | 30 s | 0.5 % | first listing card |

**Testable bound for the redesign:** *no text node's client rect may have more than **1 %** dark-field coverage in any sampled frame, over any 90-second window, at 360/768/1280/1920 px widths.* The current baseline is 3.4 % desktop / 5.4 % mobile, so 1 % is a target, not a description — and reaching 0 % (a text-protection zone in the shader) is exactly the change recovered.md#R6.5 says belongs in `desired.md`, not a parity correction. The drift is also unbounded in time: `spin` rotates elements linearly forever (`background.ts:191`, ≤ 0.025 rad/s), so the 90-second worst case is a floor on the lifetime worst case — the harness bound should be treated as the regression guard, not the ceiling.

**Password input (1.4.11).** `PasswordGate.astro:94-96` styles the input with `var(--c-accent-muted)`, `var(--c-whitebox-bg)`, `var(--c-fg)`; `:81` uses `var(--measure)`; `:101` `var(--fs-small)`; `:106` `var(--c-accent)`. **None exist in `tokens.css`** — the declarations are invalid at computed-value time and drop. Measured computed style: `border: 0px none rgb(0,0,0,0)`, background transparent. The input is invisible text on a white sheet, with no ≥3:1 boundary. Fix: define the missing tokens (or reuse `--c-btn-border`/`--c-sheet`) so the input gets a 1 px ink border; the fix is one line in `PasswordGate.astro`'s style block or six tokens in `tokens.css`.

### 1.2 Focus visibility and order (2.4.7, 2.4.11, 2.4.3)

Keyboard walkthrough of every page type (`B2`, Tab until body-loop, 5 page types):

- **Every focused element had a perceivable indicator** in Chrome — the designed 2 px ink outline on `.button:focus-visible` (`global.css:95-98`), and the UA default outline everywhere else. Focus *order* is DOM order and is sane on all page types (recorded in the harness output, e.g. /work: back link → 12 cards → …).
- **But the UA default is the only thing holding up four selector classes.** `.backlink`, `.listlink`, `.textlink` and the gate `input` have no focus rule in the codebase (`S10-focus-css`). The legacy site had none either (`grep focus src/components/layout.css` → 0), so this is parity — but any redesign that touches these elements' backgrounds or adds `outline: none` for aesthetics breaks 2.4.7 silently. Fix: one global rule, e.g. `:focus-visible { outline: 2px solid var(--c-ink); outline-offset: 3px }`, keeping `.button`'s existing values as the design reference.
- **Focus not obscured (2.4.11):** the fixed back link stays topmost when scrolled (measured via `elementFromPoint` at 600 px scroll, `B4` — passes; `main` z-index 1 sits above the sheet, and the link is the first child of `main` at fixed `left: 2rem`, `global.css:133-138`).
- **Focus on gate reveal (2.4.3):** after a correct password, `root.replaceWith(...)` removes the focused submit button and focus drops to `<body>` (`B13`). Fix: after reveal, focus the revealed content's first heading (`.cvlist` block, `cv.astro:45`) — one `el.focus()` on a `tabindex="-1"` heading.

### 1.3 The `<img alt="">` decision (1.1.1)

Two different populations share one treatment, and only one is right:

- **Listing thumbnails** (`ProjectList.astro:48-55`): empty alt is **defensible**. Each image sits inside a link whose text already names the project ("Web: Käkriäinen →", `:65`); the image adds no information the link lacks for a non-visual user, so `alt=""` (decorative, skipped) is the correct choice. Verified against the actual images (`public/images/thumbs/`): they are project screenshots — genuine content for sighted visitors, but redundant with the link text for AT. Legacy parity too: the old `listItem.js` rendered `gatsby-image` with no alt prop at all.
- **Project body images** (`[slug].astro:62-71`): empty alt is **hiding real content** — a FAIL. 41 of 41 body images across 16 of 18 project pages render `alt=""` (`S12`). These images *are* the portfolio: inspected samples show the Käkriäinen System-6 interface screenshot and an article spread — the work being presented. A screen-reader visitor gets the prose and nothing about what the projects look like. Fix: add an `alt` field to the images schema (`content.config.ts:41-49`) and one sentence per image in the content files. **This must not be invented by the redesign** — the alt text should come from the same place the `summary` fields did (the recovered live content, or the owner).

### 1.4 Headings, landmarks, language (1.3.1, 2.4.1, 3.1.1, 3.1.2)

- **Headings:** one `h1` per page on all 7 audited page types; no level skips anywhere (`S9`; /cv runs h1 → h2 h2 h2, which is correct). Pass.
- **Landmarks:** exactly one `<main>` per page (`Layout.astro:68`); no header/nav/footer exist, so nothing repeats across pages and there is no bypass-block gap beyond the landmark itself. Pass, with the note that adding a header/nav in the redesign creates the first real bypass-block requirement on this site.
- **3.1.1 Language of page:** `lang="en"` on 24 of 25 built pages (`Layout.astro:37`). The one failure is `/probe/`, which should not ship at all (finding #10).
- **3.1.2 Language of parts — FAIL.** The site is bilingual by content: 7 project titles contain Finnish (`Käkriäinen`, `Runokuu 2020`, `Ilmastonmuuttajat`, `Lukiovertailu`, `STT Tarkkailija`, `digitaalinenkirjallisuus.fi`, `Veikkaus beneficiaries`), and the only `lang=` attribute in the entire source tree is the document-level one. Screen readers announce these in English phonology. Fix: wrap Finnish runs in `<span lang="fi">` — mechanically in `ProjectList.astro:65` and `[slug].astro:30` via a per-project `lang` frontmatter field (add to `content.config.ts`), defaulting to `en`.

### 1.5 Target size (2.5.8)

Measured on 4 page types with the spacing exception applied (`B3`; axe agrees on /cv):

- **Back link** 64×19 px: under 24 px tall, but nearest other target is 232 px (/work) to ∞ (/inversion) away — **passes via the spacing exception**. It is a lone fixed text link; no change strictly required. If the redesign adds anything near the top-left corner, re-check this: the exception evaporates with proximity.
- **/cv gate links** 155×18 and 102×18 px, **0 px apart** (`<br>`-separated, `PasswordGate.astro:72-73`) — FAIL, axe serious. The "check it out" submit button (83×21 px, 16 px from the input) also FAILs. All three are consequences of finding #14 (`.btn btn--solid` is undefined, so the gate controls get no block-button padding). Fixing the class to `.button` likely fixes size and spacing at once (the designed button is 1rem-padded, ≈50 px tall).

---

## Part 2 — Performance, measured

### 2.1 JavaScript per page type (gzipped)

| Page type | JS shipped | Composition |
|---|---|---|
| `/` (home) | **10,408 B gz** | `ClientRouter` 5,373 + `Background` 5,025 + 132 B inline |
| `/work`, `/art`, project pages, `/404` | **10,276 B gz** | the same two modules |
| `/about` | 11,321 B gz | + 1,045 B inline (facts widget) |
| `/cv` | 11,180 B gz | + 904 B inline (gate) |

The two modules load on every page (`Layout.astro:65` `<ClientRouter />`, `Background.astro:58`). The shader source itself lives inline in `Background…js` (11,355 B raw / 5,025 B gz), exported as strings — GLSL stays diffable, per D4.2. This is a healthy baseline: **no page ships more than 11.4 KB of JS**, and listing/detail pages are HTML+CSS beyond the two shared modules.

### 2.2 HTML / CSS

| Asset | Raw | Gz | Budget |
|---|---|---|---|
| Largest HTML (`/cv`, with CV in template) | 12,185 B | 4,616 B | ≤ 8 KB gz |
| Home HTML | 3,861 B | 1,258 B | |
| Project HTML (median) | ~7,500 B | ~3,300 B | |
| CSS (one file, all pages) | 5,660 B | 1,879 B | ≤ 4 KB gz |

### 2.3 Core Web Vitals (lab: 360 px viewport, 4× CPU throttle, ~1.6 Mbps/150 ms RTT)

| Page | LCP | CLS | INP proxy (worst of 8 clicks) |
|---|---|---|---|
| `/` | **396–404 ms** | **0.0000** | 32–40 ms |
| `/stt-tarkkailija/` (project) | **440–496 ms** | **0.0000** | <16 ms |
| `/work/` | 564 ms (text) | — | — |
| `/art/` | **1,920 ms** (first thumbnail) | — | — |

CLS is zero everywhere because every `<img>` carries `width`/`height` (`S6-dims`: 59/59). The worst LCP is `/art/` at 1.92 s — still passing, but it is an *image* LCP driven by the same oversized-thumbnail problem as finding #9; on a real mobile connection the 716 KB `brb-email.png` class of file is the risk. Lab INP is not field INP; treat it as a smoke test, not the metric.

### 2.4 Cost of the full-viewport WebGL canvas

The canvas repaints unconditionally every rAF (`background.ts:376-382`) at `dpr` capped to 2 (`:364`) — at 1440×900@2 that is a 5.2 Mpixel fragment pass per frame, 7 elements × up to 10 grid rows of SDF evaluation per pixel (`:170-237`).

Measured frame intervals at 1440×900, 4× CPU throttle (`B9`):

| State | Median frame | p95 | Frames >16.7 ms |
|---|---|---|---|
| Canvas live | 16.7 ms | 16.7 ms | 21–24 % |
| Context lost (loop cancelled via `astro:before-swap` dispose) | 16.7 ms | 16.8 ms | 29–31 % |

On this desktop GPU the shader is vsync-bound and adds no measurable main-thread cost — the honest conclusion is that the frame time is dominated by display refresh, and the **real costs are not visible in a frame timer**: constant GPU compositing (battery), and the fact that the loop does *not* stop when a mid-session reduced-motion preference appears (finding #2), so users who most need it stopped keep paying for it. Mitigations already present: pauses when the tab is hidden (`:398-410`), DPR cap 2 (`:364`), one context per page (D4.11, `:262`, disposed on navigation `Background.astro:67`). What is missing: stop the loop (not just zero the time) when `u_reduced` is set, and freeze on `prefers-contrast`/`forced-colors` (finding #12).

### 2.5 Images — 13.0 MB, 59 files, PNG is the wrong format

| Population | Files | Bytes | Measured alternative |
|---|---|---|---|
| Thumbnails (`images/thumbs/`) | 18 | **8.13 MB** (16 over 150 KB; max 716 KB) | WebP q80 full-size: **766 KB** (10.6×); WebP q80 @640 w: **377 KB** (21.5×) |
| Body images (`images/projects/`) | 40 | 4.90 MB | dominated by photo-like PNGs; JPEG q75 measured 4.8–5.6× on the largest three; one **974 KB SVG** (`visualizing-government-1.svg`) served as an `<img>` at 640 px display width |
| Per-page worst case | — | `/work` = **5.83 MB** of thumbnails; `/art` = 1.92 MB | |

The thumbnails are displayed at ≤ 640 px wide (`.listlink` max-width 640, `global.css:170`) but ship at 1000 px; frontmatter dimensions are correct (`S8-aspect`: all match intrinsic), so nothing is broken — it is pure bytes. The retro-art thumbnails (Käkriäinen's 1-bit dithering) survive q80 WebP well; the photographic ones (brb.email) are the worst PNG offenders. There is no build-time image pipeline at all — files are copied from `public/` verbatim, so this is a content-repo fix (convert in place, or add an Astro image step; the schema already carries dimensions, `content.config.ts:32-49`, so responsive variants slot in cleanly).

### 2.6 Byte budget for the redesign

The harness enforces these as pass/fail thresholds (they are the current baseline ± the fixes above, not aspirational numbers):

| Asset | Budget | Current | Headroom |
|---|---|---|---|
| JS per page (gz) | **≤ 12 KB** | 10.3–11.3 KB | ~1 KB for new motion code — shader uniform work must stay in the existing module |
| CSS (gz) | **≤ 4 KB** | 1.9 KB | 2 KB for focus styles, `lang` spans, forced-colors/contrast blocks |
| HTML per page type (gz) | **≤ 8 KB** | max 4.6 KB | CV template grows if CV grows |
| Fonts | **≤ 30 KB, and it must actually load** | 56 KB shipped, 0 KB loaded | one `@font-face`, woff2 only |
| Thumbnail, each | **≤ 120 KB** | max 716 KB | convert to WebP |
| Listing page images (initial view) | **≤ 400 KB** | 5.83 MB (/work) | 21× available |
| Site images total | **≤ 2 MB** | 13.0 MB | 6.5× available |
| LCP (lab conditions above) | **≤ 2.5 s every page type** | max 1.92 s | protect /art |
| CLS | **< 0.02** | 0.0000 | keep width/height on every image |
| Canvas | one context; frame loop stops on hidden tab **and** on any reduced-motion state | context: pass; loop: fails mid-session | fix finding #2 |

---

## Part 3 — Motion safety

**D4.9's letter is met at load, broken on change.** The static frame is genuinely static (pixel-identical 4 s apart, 0.000 % diff, `B7`) and it is *not* a mess — the reduced-motion screenshot (`design/audit/evidence/home-reduced-motion.png`) is the field's t=0 frame: complete dashes, same composition as the animated one, visually indistinguishable in quality from a paused video of it. `start = 0` on change (`background.ts:298`) produces a deterministic frame *in intent* — but the reset only rewrites the JS clock; the `u_reduced` uniform is uploaded exactly once at mount (`:353`, confirmed by grep in the shipped bundle: 1 occurrence), so the shader never learns. Measured consequences:

- **ON mid-session:** the field keeps animating (max 2.6 % of pixels changed per 400 ms sample) and *jumps* 2.5 % of pixels at the moment of toggle (the clock restart). The user asked for stillness and got a stutter plus continued motion. (`B8`)
- **OFF mid-session:** the field never starts — 0.000 % pixel change 1.5 s later — because the rAF loop is only ever begun at mount (`:392-394`) and the change listener doesn't start it. (`B14`)

Both are one-line fixes in the `motionQuery` change handler: re-upload `u_reduced`, and start/stop the loop symmetrically.

**Does the rotating background cause disorientation?** The drift is slow — `spin` moves at ≤ 0.025 rad/s ≈ 1.4°/s (`:191`) and the dash march at 20 px/s (`:232`) — below the thresholds that typically trigger vestibular symptoms, and the legacy site had the same visual language (5-second dash sweep, R6.4). The measured risk is subtler and documented in Part 1: rotation is *unbounded in time*, so the field's relationship to the text is never stable (coverage of the intro paragraph grew 2.3 % → 3.4 % over 90 s). For a redesign explicitly targeting readability, a perpetual slow rearrangement of black ink behind text works against the goal even for users without vestibular sensitivity.

**User-facing motion toggle: yes, recommend it.** `prefers-reduced-motion` is an OS-level setting many users don't know exists; D4.9 itself says "no infinite animation without an opt-out" — the media query is an opt-out, but only for those who find it. Given the site has exactly one infinite animation, a small "pause background" control (persisted in `localStorage`, checked before the media query) costs a few hundred bytes and converts an invisible accommodation into a visible feature. This is a `desired.md` decision, not parity.

**`prefers-contrast`:** absent (grep → 0 hits). 1.4.6 is not failed today — ink-on-white is 21:1, AAA — but the interference pattern of strokes over text is precisely what a `prefers-contrast: reduce` user is asking to avoid. The cheap correct behaviour: hide or fade the field under that query (the fallback gradient at `Background.astro:45-51` already exists as the no-WebGL path and can be reused).

**`forced-colors`:** absent. CSS surfaces adapt via UA forcing (measured: button border forced to `rgb(0,0,159)`), but the shader draws its own pixels and is untouched by forced-colors — black strokes will paint over whatever palette the user chose. Since the canvas is decorative and already `aria-hidden` (`Background.astro:20`), the fix is to stop rendering it under `@media (forced-colors: active)` — which also removes its GPU cost for exactly the users least able to pay it.

---

## Part 4 — The audit harness

**`design/audit/audit.mjs`** — 79 checks, re-runnable, exit-code driven (0 pass, 1 fail, 2 could-not-run):

```
cd design/audit && npm install        # once: playwright-core, axe-core, pngjs
node audit.mjs                        # builds rebuild/ (with a dummy CV password),
                                      # serves dist, runs every check, prints ✓/✗
SKIP_BUILD=1 node audit.mjs           # audit an existing dist
```

It builds via `astro build` (PATH-prepended for the Homebrew node, per the repo's node-18.17 floor), spawns `astro preview`, and runs two stages: **static checks** on `dist` (JS/HTML/CSS budgets per page type, CV-in-payload marker, font loading, alt/dimension/lang/heading inventory, image byte budgets, frontmatter-vs-intrinsic aspect, dev-page detection) and **browser checks** in Chrome (axe-core wcag2a+2aa+21aa+22aa per page type, focus walkthrough with per-element indicator detection, target size with spacing exception, contrast pairs, field-over-text pixel sampling, reduced-motion in both toggle directions with pixel-diff, canvas frame cost with CPU throttle, LCP/CLS/INP-proxy under throttled conditions, 320 px reflow, gate error/border/focus behaviour). Evidence screenshots land in `design/audit/evidence/`.

Current output: **50 pass, 15 fail, 3 warn, 11 info** — the failures are exactly findings #1–14 above; nothing in this report is asserted that the harness cannot re-derive.

Two sibling scripts document the deeper probes used in this report: `probes.mjs` (reverse reduced-motion toggle, field coverage over time, `data-password` DOM check, font load state), `coverage-long.mjs` (the 90-second/mobile text-coverage table in Part 1), `probes2.mjs` (listing LCP, gate focus, forced-colors, body-image census).

**Known gaps in the harness** (stated, not hidden): no print-output rendering (G10/parity-checker territory); INP is a lab proxy, not field data; the field-over-text bound samples frames at 250–1500 ms intervals, so sub-frame worst cases between samples are unseen; axe covers only what axe covers — it reports the target-size failure on /cv and nothing else, which is itself the argument for the custom checks (five of the eight AA failures here are invisible to automated scanners).

---

## What must not be lost by the redesign

The audit found real defects, but the baseline is also *good* in ways a "modernize" pass could quietly destroy:

1. **Zero CLS, 10 KB JS, 1.9 KB CSS** — the islands architecture is carrying its weight; every new animation should fit inside the existing two modules (budget table, Part 2.6).
2. **The brutalist composition is intact** — full-opacity field over text is parity by explicit decision (R6.5); changing it is a `desired.md` item, and this audit supplies the measurement (1 % bound) to change it *against*.
3. **The honest gate claim** — CV in payload, "not rendered" never "not readable" (D3.1); still true, and the harness pins it (`S4-cv-bundle`).
4. **The static reduced-motion frame is good** — measured identical across time and visually equivalent to the animated state; whatever replaces it should hold that line.
