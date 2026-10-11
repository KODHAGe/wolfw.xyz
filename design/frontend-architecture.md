# Front-end architecture — wolfw.xyz redesign substrate

Status: draft · Zone: **architecture** (the substrate a redesign is built on)

Owner of this document: front-end architecture. Sibling documents own typography
(`design/typography.md`), the generative layer (`design/visual-effects.md`) and
content (`design/content-strategy.md`). Where this document touches their ground
it defers and cites rather than restating.

---

## 0. Method, and what was actually verified

Everything below marked **(verified)** was checked against the working tree and,
where the claim is behavioural, against `astro build` output served locally and
driven in a real browser at 1440×900. Nothing here is inferred from the spec
documents; the spec documents are cited only where they state a decision.

The audit found the substrate in better shape than its reputation and worse
shape than its comments claim. The content architecture (D1) is essentially
**done**, not pending. The two genuinely load-bearing defects are a font that
never loads and a background that dies on the first in-site navigation.

### 0.1 Claims the brief asked me to check

| Claim | Result |
|---|---|
| `webglcontextlost` handled? | **No.** Zero matches for `webglcontextlost\|contextlost\|webglcontextrestored` across the repository **(verified)**. `design/visual-effects.md` §4.2 owns the fix. |
| `ClientRouter` actually mounted? | **Yes** — `rebuild/src/layouts/Layout.astro:65`. |
| View-transition fallback for Firefox? | **Yes, but not the one the code comments describe.** See §4.3. |

### 0.2 Five defects found by running it, not reading it

These are not in any existing document. Each was reproduced against
`astro preview`-equivalent local serving of the built output.

**A1 — The brand typeface never loads.** There is no `@font-face` anywhere in
`rebuild/src` **(verified: grep, zero matches)**. `--font-mono: "Necto Mono",
sans-serif` (`rebuild/src/styles/tokens.css:43`) names a family that is never
declared, so every glyph renders in the generic sans fallback. The font files
exist and are served — `rebuild/public/fonts/Necto-Mono.woff2`, `.woff` — but
nothing references them. The legacy site did declare it
(`src/fonts/fonts.css:1-7`) and imported it from its layout
(`src/components/layout.js:9`); the rebuild's layout does not
(`Layout.astro:17-18` imports only `tokens.css` and `global.css`).

Side-by-side at 1440×900: the live site renders `wolfw.xyz` in Necto Mono; the
rebuild renders the same string in proportional sans. **Every typographic
decision in `design/typography.md` is currently specified against a face the
rebuild does not render.** One `@font-face` block is the highest-value line of
code in this document.

**A2 — The background dies on the first in-site navigation.** Reproduced: full
page load of `/work` renders the sine field; navigating `/` → `/work` through
`ClientRouter` leaves the canvas blank, with the white sheet intact.

Mechanism: `Background.astro`'s mount script is an external module script
(`rebuild/dist/_astro/Background.astro_astro_type_script_index_0_lang.BpfwGIol.js`).
Astro marks executed scripts and skips them on swap
(`node_modules/astro/dist/transitions/router.js:81-108`), and an external ES
module is additionally deduplicated by the browser's module map — so re-inserting
it does not re-execute it. The `astro:before-swap` disposal
(`Background.astro:67`) fires, but nothing remounts. `Facts.astro:129` and
`PasswordGate.astro:163` both solve this with an `astro:page-load` re-init;
`Background.astro` does not.

This is the sharpest statement of the ClientRouter tension: **the router and the
WebGL substrate are currently incompatible** (§4.4).

**A3 — Four interactive elements have no styles at all.** `class="btn btn--solid"`
appears at `PasswordGate.astro:66`, `Facts.astro:37`, `Facts.astro:40` and
`cv.astro:86`. **No CSS rule defines `.btn` or `.btn--solid` anywhere**
**(verified)**. The legacy styled all four — `.PasswordProtect-module--submit`,
`.facts-module--button`, `.printButton` in the served CSS. So the gate's submit
button, the facts widget's advance button and mailto link, and the CV print
button all render as unstyled native elements. This is a live visual regression
and it is a component-API problem (§3.4).

**A4 — Six undefined custom properties, and eleven unused ones.** Referenced but
never defined: `--measure`, `--c-accent`, `--c-accent-muted`, `--c-whitebox-bg`,
`--c-fg`, `--fs-small` — all six in `PasswordGate.astro:81,94-96,101,106`
**(verified)**. At invalid-at-computed-value time these resolve to nothing, so
the gate's input loses its border and the gate loses its max-width. Defined but
never referenced: `--c-btn-border`, `--c-btn-shadow`, `--c-ink-soft`,
`--c-sheet-shadow`, `--dur-dash-sweep`, `--dur-instant`, `--dur-quick`,
`--ease-spring`, `--fs-body`, `--sheet-inset`, plus one more
**(verified)**. Both directions are silent failures; §2.4 makes them build
errors.

**A5 — A listing class is doing the wrong job on the detail page.**
`[slug].astro:32` renders `<p class="listtitle">{categories} · {date}</p>`. But
`.listtitle` (`global.css:186-195`) is the listing *badge* — white background,
`padding: .5rem`, `margin-top: -3rem`. Measured computed style on the live
detail page: `background-color: rgb(255,255,255)`, `margin: -48px 0px 32px`,
`display: inline-block`. The project meta line is being pulled 48px upward under
the `<h1>` and wrapped in a white box. Harmless on a white sheet, wrong on a
`whitebox` page and wrong the moment the detail layout changes. This is what
global class names buy you (§2.2).

### 0.3 Corrections to the brief's premises

Recorded because a design that starts from a wrong number inherits it.

- **53 images → 59.** `rebuild/public/images` holds 59 files: 18 thumbnails and
  41 project body images **(verified)**.
- **"Only one real breakpoint" is not quite the legacy's story.** The legacy had
  one `@media screen and (max-width: 600px)` block in `layout.css:106-108` that
  was **empty** — it contained no rules. The only substantive 600px rule in the
  legacy is `.projectVideo` (`src/pages/projectPage.css:19-25`). The rebuild's
  `global.css:319-342` block is therefore *new behaviour written at the legacy
  breakpoint*, not legacy behaviour. It is reasonable behaviour, but it is a
  rebuild invention and should be treated as such when parity is re-checked.
- **`publishedAt` is not merely "a placeholder" — it is a visible ordering
  defect.** All 18 project files carry `publishedAt: 2020-01-01`
  **(verified: one distinct value across 18 files)**. `ProjectList.astro:29`
  sorts descending on it, so both `/work` and `/art` sort on a constant and the
  displayed order is the glob's file order, i.e. alphabetical by filename.
  `/work` currently reads Diabetes, brb.email, digitaalinenkirjallisuus.fi,
  Election day results, Approval rates … — alphabetical, not chronological.
  **(verified in browser.)** That is a defect on a portfolio whose cards claim
  to be ordered by date, and it is the whole of what G1 blocks.

### 0.4 What is already right, and must not be broken

The audit is mostly bad news because that is what audits are for. The following
are correct and are the foundation the redesign builds on:

- Content collections with zod schemas for all three types
  (`content.config.ts:17-58, 64-84, 90-95`). D1.1 and D1.2 are, for the rebuild,
  **already implemented** — 18 project files, 3 CV YAML files, 1 facts JSON.
- The D3.3 build guard runs at `astro:config:setup` and fails the build on a
  private or unreachable project (`astro.config.mjs:51-63`).
- `summary` is present in the project schema (`content.config.ts:27`) and is
  **never rendered** anywhere **(verified)** — free content for the redesign.
- Width/height carried alongside every image (`content.config.ts:32-34, 41-49`),
  so layout shift is already solved.
- Reduced motion renders a *static frame*, not a slow one
  (`background.ts:392-394`), which is what D4.9 requires.
- The two islands are correctly scoped, correctly guarded against double-init,
  and correctly re-initialised on `astro:page-load`.
- Build output: 25 pages, 36 KB of JS in `dist/_astro` total. The substrate is
  not heavy.

---

## 1. Responsive strategy

### 1.1 The problem, stated precisely

The site has exactly **one layout container**: `main`, `max-width: 640px`,
centred by `margin: auto`, `text-align: center`, `padding: 2rem`
(`global.css:37-44`). Every page is that column. The white sheet behind it is
full-viewport and never changes (`Background.astro:26-36`).

So this is not a multi-column grid problem. It is a **column-width** problem,
and the current strategy models it wrong: one 600px media query
(`global.css:319-342`) does four unrelated jobs — step down `main`'s padding,
un-fix the back link, wrap the button pair, and un-constrain the project video —
because those four things happen to share a threshold. That is the definition of
a breakpoint doing work it was not chosen for.

The second error is that **640px is one number wearing three names**:
`--measure-main`, `--measure-text`, `--measure-video` (`tokens.css:58-60`) are
all 640px. That is correct for prose — `design/typography.md` §1.2 measured 65
characters per line, inside the 45–75 band — and wrong for media. A 1000px-wide
thumbnail is displayed at 640px on a 2560px display. Eighteen of this site's
pages are image-led project pages; capping their images at the prose measure is
the single largest responsive mistake currently being made.

### 1.2 The architecture: container queries inside, media queries at the shell

**Rule: components respond to the column; only the page shell responds to the
viewport.**

The column's width is `min(640px, 100vw − 2×padding)`. Every layout decision
*inside* it — button stacking, badge overlap, CV entry stacking, the facts
widget's fixed height — is a function of that number, not of the viewport. Two
viewports at 1440px and 2560px have an identical column and must have identical
component behaviour; a viewport media query cannot express that without
modelling centring arithmetic. Container queries can, in one declaration.

Concretely: `main` gains `container-type: inline-size; container-name: column`.
Components inside query `@container column (width < N)`.

The shell — the sheet inset, `main`'s own padding, and the back link's position
— is genuinely viewport-bound and stays media-queried.

Container queries are Baseline (Chrome 105, Firefox 110, Safari 16) and are
available in Astro 5 with no build step. There is no engine in this site's
support envelope that lacks them.

### 1.3 What each tier is *for*

Four tiers, each named for its job rather than its width. Widths are the
implementation of the job, not the definition of it.

| Tier | Range | What changes, and why |
|---|---|---|
| **compact** | < 480px | *Fits the column on the smallest phones.* `main` padding steps down (2rem → 1.25rem); the button pair stacks; `.fact` drops its fixed `height` for `min-height` (§1.5); the badge overlap halves. |
| **comfortable** | 480–799px | *The parity band.* The legacy's 600px threshold lives here and its behaviour is preserved for checkability. Column = viewport minus padding. |
| **column-capped** | 800–1199px | *The column has stopped growing; centring has started.* Column pinned at 640px, centred. Media measure still equals prose measure. |
| **gallery** | ≥ 1200px | *Images are no longer the constraint.* Prose stays at 640px; media measure grows (`--measure-media` steps up). The back link's detachment is worst here and is fixed structurally (§1.4), not by a breakpoint. |

The tiers are expressed as container queries on `main` for everything inside the
column, and as a *single* media query at the shell. The 600px breakpoint is not
deleted — `design/typography.md` §2.5 keeps it as the parity anchor — but it
stops being the only tool.

### 1.4 The three named items

**The fixed back link.** `global.css:133-138` gives it `position: fixed;
left: 2rem` and no `top`, so it sits at its static vertical position but is
pinned to the *viewport's* left edge. Measured at 1440×900: the back link sits
at x=32 while the content column's first element sits at x=400 **(verified)**.
The link is ~370px from the content it belongs to. Below 600px it goes static
(`global.css:324-328`).

The defect is not the breakpoint, it is the **containing block**. `position:
fixed` anchors to the viewport; the column is centred; the two drift apart as
the viewport widens, and no breakpoint repairs that. Two candidate fixes, both
requiring a `desired.md` entry because `fixed` is recovered behaviour
(`src/components/layout.css:85-90`, `recovered.md#R2.4`):

1. **`position: sticky` inside `main`.** Stays attached to the column at every
   width, remains visible while scrolling, and the 600px rule disappears
   entirely. Recommended.
2. Keep `fixed`, but wrap the column and derive `left` from the column's own
   offset. Keeps parity, costs a wrapper element and arithmetic.

Option 1 also restores a second lost behaviour: the legacy back link called
`window.history.back()` with `href="/"` as the no-JS fallback
(`src/pages/projectPage.js:12-17`, `recovered.md#R2.4`). The rebuild is a plain
`<a href="/">` at four call sites (`ProjectList.astro:33`, `about.astro:23`,
`[slug].astro:28`, `cv.astro:29`) — so "back" goes home, not back. That is a
parity regression hiding inside a styling decision, and it is why the link
should become a component (§3.3) before it becomes sticky.

**The full-width block buttons.** `.button { display: block }`
(`global.css:68-82`) is recovered and correct. The pair is not:
`.double-button .button { width: calc(50% - 3rem) }` (`global.css:111-114`)
resolves at 640px to two 272px buttons separated by a **96px** gutter — the
3rem is baked into a width calculation rather than expressed as a gap. Below
600px the pair wraps and each button goes 100% (`global.css:330-336`).

Replace the width arithmetic with a grid on the *pair container*:

```
.double-button {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
  gap: var(--space-2);
}
```

`auto-fit` + `minmax` gives the stack-below / side-by-side-above behaviour with
no breakpoint at all, and `gap` replaces the magic 3rem. The `block` prop on
`Button` is then not merely dead (§3.2) but actively unnecessary.

**The 640px measure on wide screens.** Split the measure from the media width.
`--measure-main` stays 640px and governs prose. Introduce `--measure-media`,
equal to it below the gallery tier and stepping up above it, and apply it to
`img`, `video`, `figure` and the project block. `--measure-video` and
`--measure-text` collapse into the two real tokens; three names for one number
is exactly the duplication that breaks when the numbers finally diverge.

`main` itself does **not** widen — prose measure is the point of the column, and
`design/typography.md` §2.3 already recommends media exceeding the prose
measure. The media slot breaks out; the column does not grow.

### 1.5 Two defects this architecture retires

- **`.fact { height: 3rem }`** (`global.css:290-295`) is a fixed height on a
  text element. At a narrow column the fact wraps to three lines and overflows
  the fixed box — `design/typography.md` T1 measured 21px of overflow at 600px.
  A container query converting it to `min-height` below the compact threshold
  fixes it without a viewport query and without touching the desktop
  appearance.
- **`.listtitle { margin-top: -3rem }`** (`global.css:193`) is a 48px overlap
  tuned to one image height. It is also being reused on the detail page where
  it means nothing (§0.2 A5). Once the badge is component-scoped (§2.2) the
  overlap becomes a container-driven token and stops leaking.

---

## 2. CSS architecture

### 2.1 What is wrong today

`global.css` is 443 lines in one unlayered sheet containing four different kinds
of thing: transcribed legacy rules with `/* legacy … */` provenance comments,
new rebuild decisions, a print block, and view-transition rules. `tokens.css` is
124 lines mixing recovered values with new motion tokens, distinguished only by
comments.

The provenance comments are load-bearing and they say so themselves:
`tokens.css:8-10` records that "the earlier token file was a guess … none of
that was the real design", and `global.css:8-11` records that the first rebuild
invented a design whose divergence was invisible. **The restructure must make
provenance structural, not documentary** — otherwise the next restructure is the
one that quietly loses it.

### 2.2 Global vs component: the dividing line

**A selector is global if and only if one of these is true:**

1. **It relies on inheritance from an element.** `html`, `body`, `a`, `main`,
   `h1-h3`, `p` (`global.css:15-59`). Cannot be scoped.
2. **It targets something outside the component tree.** `@page` and
   `@media print` (`global.css:349-395`) address the whole document and print has
   no component boundary. `@view-transition` and `::view-transition-old/new`
   (`global.css:406-443`) address browser-generated pseudo-elements that no
   component owns — and `Layout.astro:55-60` already records that Astro's
   scoped-CSS pipeline silently drops the at-rule from an inline component
   style, which is why it must live in a real stylesheet.
3. **It must reach elements not yet written.** The `prefers-reduced-motion`
   collapse (`tokens.css:107-124`).

**Everything else moves into the component that emits it.** By that test,
`.button`, `.listlink`, `.listtitle`, `.project-block`, `.project-video`,
`.cvlist*`, `.fact*`, `.gate*`, `.backlink`, `.textlink`, `.description`,
`.caption` are all component styles that happen to live in `global.css`. Every
one of them is emitted by exactly one component today — and A5 is the price of
having left `.listtitle` where a second component could reach it.

One component already does this correctly: `Button.astro:83-128` scopes its own
styles. One uses `is:global`, at `Button.astro:141-145`, for the gooey
feature-gate. That is the pattern, and it should stay rare.

### 2.3 Layering, and the Astro-specific trap

Declare layers once, in `Layout.astro`'s import chain:

```
@layer tokens, base, components, print, transitions;
```

- `tokens` — the two token files (§2.4).
- `base` — the inheritance and element defaults from §2.2(1).
- `components` — nothing initially; components are scoped, see below.
- `print` — the `@page` / `@media print` block.
- `transitions` — `@view-transition` and the `::view-transition-*` rules.

**The trap that must be stated, because it inverts the usual advice.** Astro
scopes component `<style>` blocks by adding `data-astro-cid-*` attribute
selectors, which raise specificity — and unlayered rules beat layered ones. So
if the global sheet goes into a layer and component styles do not, **component
styles always win, at every specificity, regardless of import order.**

That is the correct outcome here and should be adopted deliberately rather than
discovered: components override the global sheet, deterministically. The rule to
write down is *"a component's own styles are final; to be overridable a style
must be global"*. Today exactly one style needs to be overridable and it already
uses `is:global`. The alternative — layering component styles too — costs
`is:global` on every component and buys nothing on a site this size.

### 2.4 Tokens: split by provenance, then enforce

**Split the token file by provenance, not by category:**

```
src/styles/
  tokens.recovered.css   — values transcribed from the legacy served CSS
  tokens.new.css         — values invented by the rebuild or reserved for D4
  tokens.css             — @import of the two, plus a one-paragraph contract
```

Each file keeps its existing header comment verbatim (`tokens.css:1-10` for
recovered, `tokens.css:76-82` for the new motion layer). Provenance then
survives any future restructure because it is a **filename** — the next person
cannot flatten the two files without visibly changing an import.

The category prefixes (`--c-`, `--fs-`, `--space-`, `--measure-`, `--pad-`,
`--dur-`, `--ease-`) are sound and should be kept.

**One cross-file coupling must be documented where it is used.** `--c-field` is
read *from JavaScript* via `getComputedStyle` (`background.ts:343-346`) to set a
shader uniform. It is therefore not merely a CSS token but a JS interface, and
it belongs in `tokens.recovered.css` because its value (`#000`) is recovered
(`backgroundElement.js` defaultProps). Renaming it breaks the GPU layer. The
token file should say so; so should `background.ts`.

**Enforce the token file at build time.** The existing
`astro:config:setup` integration (`astro.config.mjs:22-76`) is the right home
for a ~40-line check that parses `tokens*.css` and greps `src/` for
`var(--x)`, failing the build on **either** direction:

- referenced-but-undefined → would have caught all six of A4's missing tokens;
- defined-but-unreferenced → would have caught the eleven dead ones.

Both are currently silent. Turning them into build errors is what makes the
token file a contract instead of a wish.

### 2.5 Print

The print block (`global.css:349-395`) is correct in substance and transcribed
faithfully. Two notes: it addresses `header` and `footer`
(`global.css:367-374`) which **the rebuild never renders** — `Layout.astro:63-72`
has neither element — so those two rules are dead today and should be either
removed or kept deliberately against a future `Header`. And `gaps.md#G10`
(print contents unspecified) is closable: the block is now known, and the only
open item is a render-to-PDF check on `/cv`.

---

## 3. Component API for the redesign

### 3.1 The rule

Four rules, each of which the current `Button.astro` breaks at least once:

1. **No prop without a call site.**
2. **No prop whose entire effect is a class that has no rule.**
3. **Every component owns its styles, or declares explicitly that it does not.**
4. **Typed unions over optional-boolean soup.**

### 3.2 Audit of the current `Button` props

`Button.astro:24-34` — `href`, `goo`, `locked`, `block`, `class`, plus
`[key: string]: unknown`.

| Prop | Verdict | Evidence |
|---|---|---|
| `href` | **Load-bearing.** Determines `<a>` vs `<button>` (`Button.astro:45`). Used at all seven home buttons. | `index.astro:24-45` |
| `locked` | **Load-bearing for parity.** Reproduces the 🔒 glyph with `role="img" aria-label="locked"` (`Button.astro:74-78`), per `recovered.md#R3` / `index.js:24`. | one call site, `index.astro:29` |
| `block` | **Dead.** Emits `button--block` (`Button.astro:48`) and **no CSS rule for that class exists anywhere** **(verified)**. It cannot have any effect — and `.button` is already `display: block` (`global.css:70`) regardless. | two call sites pass it, `index.astro:24-25` |
| `goo` | **Speculative.** Zero call sites **(verified)**. Reserved for D4.5. Its feature gate is also wrong: `typeof SVGFilterElement !== "undefined"` (`Button.astro:134`) is true in Safari and Firefox, yet the comment at `Button.astro:17-19` states the alpha trick is *not* implemented there — so the gate tests a capability that is present in browsers where the effect fails, and the `is:global` fallback at `Button.astro:141-145` never fires. | none |
| `[key: string]: unknown` | **Harmful.** Silently forwards any mistyped prop to the DOM. | `Button.astro:33,48` |

### 3.3 Proposed surface

```ts
// Button.astro
type ButtonProps =
  | { href: string; locked?: boolean; external?: boolean; class?: string }
  | { type: "button" | "submit"; disabled?: boolean; class?: string };
```

`external` replaces the repeated `target="_blank" rel="noopener noreferrer"`
triple at `index.astro:33-34,41-42` and lets the component own the safety
attribute. `block` and `goo` are removed; `goo` returns when D4.5 has a real
implementation and a real feature test (one that renders and measures, not one
that sniffs an interface).

**Components the redesign needs and does not have:**

- **`BackLink`** — four byte-identical copies of `<a class="backlink"
  href="/">← BACK</a>` (`ProjectList.astro:33`, `about.astro:23`,
  `[slug].astro:28`, `cv.astro:29`). The component restores both the
  deduplication *and* the lost `history.back()` behaviour (§1.4).
- **`ProjectCard`** — the `.listlink`/`.listtitle` pairing
  (`ProjectList.astro:46-66`) including the `isAgency` lock rule from
  `recovered.md#R1.4`. Fixes A5 by construction: the badge class becomes
  card-scoped and cannot reach the detail page.
- **`CvEntry`** — the seven-field CV item (`cv.astro:64-80`), which today
  duplicates in inline JSX the shape of the deleted `cvListItem.js`.
- **`GateForm`** — absorbs the unstyled `.btn btn--solid` submit (A3).
- **`Prose`** — a wrapper carrying the 640px prose measure, so the number lives
  in one component instead of three token aliases (§1.4).

### 3.4 The `.btn` hole is the argument

A3 is the concrete consequence of the current approach. Four interactive
elements were given class names that no stylesheet defines, and the failure was
invisible in review because unstyled buttons still look like buttons. Routing
all four through `Button` (§3.3) removes the class name from the system
entirely, which removes the failure mode. **This is the single most user-visible
fix in this document after the font.**

---

## 4. The view-transition problem

### 4.1 What is actually deployed

Three things, and they serve **different JS states, not different browsers**:

- `<ClientRouter />` (`Layout.astro:65`) — intercepts link clicks and performs
  same-document navigation. Its default `fallback` is `"animate"`
  (`node_modules/astro/components/ClientRouter.astro:12`), and the router arms
  itself whenever `supportsViewTransitions || getFallback() !== "none"`
  (`router.js:408`). So with JS on, **every** browser gets an animation.
- `@view-transition { navigation: auto }` (`global.css:406-408`) — enables
  *cross-document* transitions. Only meaningful when a navigation is **not**
  intercepted, i.e. JS off or JS not yet loaded. Chromium 126+ and Safari 18.2+
  only.
- The root keyframes (`global.css:416-436`) — a 240ms slide-out-left /
  420ms slide-in-right pair applied to `::view-transition-old/new(root)`.

### 4.2 The two defects

**Every ClientRouter navigation throws.** Reproduced on every in-site
navigation: `Uncaught (in promise) InvalidStateError: Transition was aborted
because of invalid state`. This is the `startViewTransition` promise rejecting.
The navigation completes; the animation is not reliably played. Whatever the
root cause, the branded transition D4.1 ranked third of five is not currently
being delivered, and there is a console error on every click. This needs a
reproduction and a fix before any new transition design is layered on top.

**And it kills the background** (§0.2 A2). This is the decisive fact for the
strategy below: ClientRouter and the WebGL substrate are incompatible as
shipped, because the router does not re-execute the module that mounts the
canvas.

### 4.3 The Firefox answer, stated correctly

Firefox has **no cross-document view transitions** (caniuse: partial from 144,
meaning same-document only). So:

- **JS on:** Astro intercepts, swaps the DOM itself, and applies its own
  simulated animation. Firefox users *do* get a transition. This is precisely
  what `desired.md#D4.6` asks for ("`<ClientRouter />` providing fallback
  simulation for unsupported browsers").
- **JS off:** plain navigation. Nothing breaks; nothing animates.

The real Firefox gap is narrower than "no fallback": the *branded* keyframes are
written against `::view-transition-*` pseudo-elements, which exist only on the
native cross-document path. So Chromium/Safari no-JS users get the slide,
Firefox JS-on users get Astro's generic fade, and the two designs have diverged
by construction. The fix is to express the motion **once**, as an Astro
transition (`transition:animate`) that both paths consume, rather than as
pseudo-element rules only one path can see.

### 4.4 Recommendation: keep it, narrow it, and fix the substrate first

D4.1's owner enumeration ranks page transitions third of five, so the feature
is wanted. But the honest cost/benefit is:

- `@view-transition` is 4 lines and buys Chromium/Safari **no-JS** users a
  crossfade. Keep it; it degrades to plain navigation everywhere else.
- ClientRouter is what gives every browser, Firefox included, an animated
  navigation with JS on. Keep it.
- The two must not both define root animations. Assign the branded motion to the
  Astro-transition path and leave `::view-transition-*` as the no-JS cross-doc
  path with a plain crossfade.

**Sequencing matters more than design here.** Before any new transition is
specified, two things must land, in this order:

1. **Fix A2** — remount the background on `astro:page-load`, or persist the
   canvas across swaps with `transition:persist` (`PERSIST_ATTR` exists in the
   installed router at `router.js:36`). Until this lands, every animated
   navigation is also a *background-losing* navigation, and the transition
   design is being evaluated on a broken substrate.
2. **Fix the abort** (§4.2) so the animation that does run is the animation
   that was designed.

**No-JS is a designed outcome, not a failure.** With JS off: plain navigation,
and — because the canvas is mounted by JS and its CSS fallback is *also* set by
JS (`background.ts:271-274`) — a plain white sheet with no field. That is
acceptable and should be written down as intended, so nobody later "fixes" it
into a half-initialized canvas.

**Reduced motion currently has three opt-outs** for one behaviour: the duration
collapse (`tokens.css:107-124`), the at-rule disable
(`global.css:410-414`), and `animation: none` on the pseudo-elements
(`global.css:438-443`). Consolidate to one, in the `transitions` layer.

---

## 5. Build and deploy

### 5.1 What is buildable today

`astro build` succeeds and produces 25 pages with 36 KB of JS total
**(verified)**. D2.2 (Vercel) and static output hold: no adapter
(`astro.config.mjs:6-13`).

Three things a redesign would trip over immediately:

- **Node.** The repository's default `node` is v18.16.0 and Astro 5 refuses it
  ("Please upgrade Node.js to a supported version: >=18.20.8")
  **(verified: `npm run build` fails)**. `rebuild/package.json` has no `engines`
  field, so Vercel resolves its own default and may fail on a deploy that a
  developer already saw fail locally. Add `"engines": { "node": ">=18.20.8" }`.
- **No CI of any kind.** No workflow files exist in the repository
  **(verified)**. `desired.md#D1.1`'s rationale is that Git integration becomes
  "the *complete* deploy story — one visible mechanism instead of two, one of
  them hidden". That is only half true today: Vercel deploys on push, but
  **nothing validates before the push reaches production**. The D3.3 build
  guard runs inside the build (`astro.config.mjs:22`), which on Vercel means a
  failed guard is a failed *deploy*, not a failed PR. For a redesign touching
  responsive behaviour, CSS structure and transitions across 25 pages, that is
  the highest-probability way to break a real person's live portfolio. One
  workflow running build + the token check (§2.4) + the existing axe harness
  (`design/audit/`) is roughly thirty lines and is the cheapest risk reduction
  available.
- **`probe.astro` ships to production.** `dist/probe/index.html` exists
  **(verified)**. It is a dev-only shader diagnostic whose import of
  `/src/lib/background.ts` cannot resolve in the built output. Exclude it from
  the build, or accept it as a deliberate public debug page.

### 5.2 What a redesign blocks on

| Blocker | What it stops | Cost to close |
|---|---|---|
| **The missing `@font-face` (A1)** | *Everything typographic.* `design/typography.md` specifies a type system for Necto Mono; the rebuild renders sans. | One `@font-face` block. Minutes. **Do this first.** |
| **A2 — background vs ClientRouter** | Any transition work, and any navigation-dependent visual review. | `astro:page-load` remount or `transition:persist`. Small. |
| **G1 — Sanity read token, project `5re0s6iv`** | Real `publishedAt` values only — see §5.3 for why that is more than it sounds. | Read token + export. Minutes once the token exists. |
| **A3, A4** | The gate, facts widget and print button render unstyled; the gate has six undefined tokens. | Route through `Button`; add the build check. Small. |

Nothing in this list is a framework problem. All four are hours of work, and
three of them are minutes.

### 5.3 Migration path for the 18 projects and the CV

**The migration is done.** This is the most important correction in this
document to the shape of the remaining work. `rebuild/src/content/projects/`
holds 18 files, `rebuild/src/content/cv/` holds three YAML sections,
`rebuild/src/content/facts/` holds the facts — all schema-validated
(`content.config.ts:17-95`), all in Git, and Sanity appears **nowhere in the
rebuild's dependency tree** (`rebuild/package.json` contains only `astro` and
`yaml`) **(verified)**. D1.1, D1.2 and D1.3 are, for the rebuild, implemented.

What remains is **decommissioning, in this order:**

1. **Close G1** — read token for project `5re0s6iv`, dataset `prod`, export
   `title`/`slug`/`publishedAt` for the 18 documents. This is the only thing G1
   actually blocks (§0.3: the current placeholder makes both listings sort
   alphabetically while presenting themselves as chronological).
2. **Move the CV identity block into content.** `cv.astro:46-51` hardcodes the
   name, roles, focus areas and location in JSX — the exact pattern D1.1 was
   written to remove, carried forward. Three lines of YAML.
3. **Restore the `summary` field to the design.** It is in the schema and
   rendered nowhere (§0.4). The redesign's card and detail treatments have a
   ready-made field to use.
4. **Delete the legacy tree** — `src/`, `gatsby-*.js`, `now.json` (D2.3, still
   present at the repository root), and the dead UA analytics with it (D2.4, at
   `gatsby-config.js:9-17`). Note that `rebuild/src/lib/build-guard.ts` is also
   dead code: the live guard is the inline integration at
   `astro.config.mjs:15-78`, and nothing imports the module.
5. **Then cancel Sanity.** Not before step 1, because the export is the only
   record of the real dates.

**On G1's read token specifically.** It is one credential and it is worth
getting, but it should be scoped in the request to what it closes: the schema
export G1 asks for is a larger artefact than the redesign needs. The redesign
needs three fields from eighteen documents. Ask for the narrow export first; the
full schema can follow when the legacy tree is deleted, and `content.config.ts`
is already the schema of record for the rebuild.

### 5.4 Environment and content hygiene

- `rebuild/.env` exists and is gitignored; `.env.example` documents
  `PUBLIC_CV_PASSWORD` and states honestly that `PUBLIC_*` is inlined into the
  client bundle at build time. That is correct and matches `desired.md#D3.1` —
  the gate is a UX affordance, and the honesty note belongs in the file.
- `rebuild/public/manifest.webmanifest` declares `theme_color: "#663399"` — the
  Gatsby default purple, not the site's `#bc89ff` (`tokens.css:21`). Trivial, but
  it is the kind of stale value a visual redesign should sweep.

---

## 6. Sequencing

The order is driven by dependency, not by size. Each step is independently
landable and independently verifiable.

1. **The `@font-face`** (A1). Nothing typographic can be reviewed until it
   lands, and it is the smallest change with the largest effect.
2. **The token check and the split** (§2.4). Turns A4 into build errors and
   makes provenance structural before any restructure moves it.
3. **Background remount + transition abort** (§0.2 A2, §4.2). Restores the
   substrate that every subsequent visual and transition review depends on.
4. **Route the four unstyled elements through `Button`; delete `block` and
   `goo`; add `BackLink`** (§3.3, A3). User-visible, and it removes three
   classes from the global namespace.
5. **Container queries and the measure split** (§1). The structural change the
   redesign actually needs; safe once steps 1–4 have made the column's contents
   component-scoped.
6. **Consolidate the transition design onto one path** (§4.4).
7. **CI workflow** — in parallel from step 2 onward; it is what makes steps 3–6
   safe to land on a live portfolio.
8. **Decommission** (§5.3), last, because it is the only step that removes
   something the parity checks still reference.
