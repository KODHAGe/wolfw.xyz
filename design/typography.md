# Typography and information architecture — wolfw.xyz

Zone: **DESIRED**. This document proposes changes; it does not describe recovered
behaviour. Every claim about the *current* state carries a `file:line` citation to
either `rebuild/src/` (the accepted port) or `src/` (the legacy Gatsby source), or
to `spec/`. No project name, client name or line of copy is invented; quoted copy
is verbatim.

Two other artifacts overlap this one and are referenced rather than repeated:
`design/content-strategy.md` owns copy, positioning and the date-honesty argument;
`spec/desired.md` owns the D1–D5 decisions this spec sits on top of.

**How the font numbers below were obtained.** `rebuild/public/fonts/Necto-Mono.woff`
was parsed directly (WOFF container, zlib-compressed SFNT tables; the parser was
validated against `/System/Library/Fonts/Supplemental/Arial.ttf`, whose metrics are
known). Nothing here is estimated from a screenshot or recalled from memory.

---

## Part 1 — Diagnosis

### 1.1 What the type system actually is today

There is no type system. There is a font family, five sizes that were never chosen
as a set, and whatever line-height the browser supplies.

| Property | Current value | Where |
|---|---|---|
| Family, everywhere | `Necto Mono`, one self-hosted weight (`usWeightClass` 400) | `rebuild/src/styles/global.css:19-20`; `tokens.css:43`; `src/fonts/fonts.css:1-7` |
| Base size | not set on screen — browser default 16px | `tokens.css:45` (`--fs-body: 1rem` is **defined and never referenced**) |
| Sizes in use | 0.8rem caption, 1rem body (implicit), 1.2rem fact, 1.5rem CV section title, plus the UA default h1 at 2em = 32px | `global.css:303-306`, `:290-295`, `:246-250`, UA default |
| Heading weight | forced to 400 for h1–h3 | `global.css:51-55` |
| Line-height | **never set anywhere** in `rebuild/src` → `normal` = **1.2** (measured: hhea 970 / −230 / lineGap 0, upem 1000) = 19.2px at 16px | no `line-height` rule exists; metrics from the `.woff` |
| Letter-spacing, hyphenation, `lang` | none; `hyphens` appears nowhere; the only `lang` is `<html lang="en">` | `Layout.astro:37` |
| Print size | `body { font-size: 12px !important }` — the only size override on the site | `global.css:353-356`; legacy `src/components/layout.css:134-136` |
| Column | `main { margin:auto; max-width:640px; text-align:center; padding:2rem }` | `global.css:37-44`; legacy `layout.css:21-28` |

The consequence: a 32px h1, a 16px body, and *nothing between them* except a 24px
CV section title that is only used on one page. There is no h2 or h3 treatment at
all — the legacy project page title was an `h2` with no h1 above it
(`src/pages/projectPage.js:18`); the rebuild promotes it to `h1`
(`rebuild/src/pages/[slug].astro:30`), which fixes the outline but leaves it
visually identical to body text at 32px.

### 1.2 Measure: the column is fine, and that is worth saying first

The brief asks for the character count at 640px. Measured, not assumed:

- Necto Mono advance = **610/1000 em** for *every* glyph, ASCII or accented (verified
  across the full 403-codepoint cmap; the only zero-advance glyphs are 19 combining
  marks). At 16px that is **9.76px per character**, so `1ch = 9.76px`.
- `main` content box = **640px** → **65 characters per line**.
- Project prose sits inside `.project-block { padding: 1rem }` inside that column
  (`global.css:206-210`) → **608px** → **62 characters per line**.
- CV prose sits directly in the column (`.cvlist`, `.cvlistitem` carry only
  `text-align`, `global.css:242-255`) → **640px** → **65 characters per line**.

62–65 characters is inside the accepted 45–75 band. **The measure is not the
problem and the column width should not be "fixed".** What follows it, however, is.

### 1.3 Alignment: the real problem is not where the brief expects it

`main { text-align: center }` is inherited by everything (`global.css:37-44`) — but
the two long-form surfaces already opt out:

- `.project-block { text-align: left }` — all 18 project bodies (`global.css:206-210`)
- `.cvlist`, `.cvlistitem`, `.description`, `.timetag`, `.position` — the whole CV
  (`global.css:242-270`)

So **the site's longest prose is already left-aligned.** Centre alignment survives
on: the h1s, the home intro (`index.astro:18-21`), `.fact` (`global.css:290-295`),
`.caption` (`global.css:303-306`), `.listtitle` badges (`global.css:186-195`), the
buttons (`global.css:77`), the password gate, and `404.astro:11`. Stating
"centred body text is the main offender" would be asserting from the CSS file's
top rule rather than from the pages. The honest charges against centring are
narrower, and two of them are severe:

**Defect A — the fact revealer overflows its own box on every screen narrower than
~600px.** `.fact { height: 3rem; font-size: 1.2rem }` (`global.css:290-295`,
transcribed from legacy `facts.module.css:1-6`). The box is 48px tall; at 1.2rem
the line box is 23.04px, so it holds **exactly two lines**. Arithmetic:

| Viewport | Content width | ch/line | Longest fact (`facts/wolf.json:7`, 108 chars) | Height needed | Box | Result |
|---|---|---|---|---|---|---|
| 1024px | 640px | 55 | 2 lines | 46px | 48px | fits by 2px |
| 600px | 536px | 45 | 3 lines | 69px | 48px | **overflows 21px** |
| 375px | 311px | 26 | 5 lines | 115px | 48px | **overflows 67px** |

At 375px the revealed text is `aria-live`-swapped in place (`Facts.astro:34,92-95`)
into a 48px hole, so a long fact overlaps the button and the progress readout below
it. The `@media (max-width: 600px)` block does not touch `.fact`
(`global.css:319-342`). This is the worst typography bug on the site and it is a
fixed-height bug, not a centring bug.

**Defect B — on project pages the date badge is printed over the title.**
`[slug].astro:32` renders the meta line as `<p class="listtitle">`, and `.listtitle`
carries `margin-top: -3rem` (`global.css:186-195`) — a device that belongs on the
listing cards, where it overlaps the image (`global.css:152-162`). On a detail page
`p { margin: 0 0 1rem }` (`global.css:57-59`) plus the h1's UA bottom margin
(0.67em × 32px ≈ 21.4px) collapses to **−26.6px**, i.e. the white badge covers the
bottom **69%** of a 38.4px title line. Same class, opposite intent.

**What centring genuinely costs, stated precisely.** Centring does not change the
measure: CSS breaks lines identically for `center` and `start`. What it removes is
the **fixed left edge** — the anchor the eye returns to at the end of every line.
Across the real corpus that matters more than usual, because the text is short-line
and ragged: wrapping all 97 project paragraphs at 608px gives a mean line of
**50.3 characters with a standard deviation of 15.6 characters**, a minimum of 6
characters, and **19.6% of lines more than 20% shorter than the mean** (median
paragraph length is only 67 characters — most "paragraphs" are one or two lines,
because many bodies are link lists and `Process:` fragments rather than prose).
Centring that distribution means both edges are ragged and there is no return
sweep anchor; on a page where the title is centred and the body below it is
left-aligned (every project page), the reader has to re-anchor twice per page.

### 1.4 Monospace for prose: the second charge, quantified

Necto Mono sets every character at 610/1000 em. Against a proportional baseline
(Arial, measured): mean lowercase advance **7.83px vs 9.76px at 16px — 25%
wider**, and the space character is **124% wider** (4.45px vs 9.76px). Four
concrete costs:

1. **Density.** The same 608px column holds 62 mono characters but roughly 75
   proportional ones. The CV — 12 descriptions up to 235 characters and 44 bullets
   up to 283 characters (`cv/*.yaml`) — is 20–25% taller than it needs to be.
2. **Leading.** `line-height: normal` in this face is **1.2** (measured, three
   independent metric sets agree). At 16px that is 19.2px — 3.2px of leading. That
   is correct for the display sizes it was drawn for and too tight for prose; no
   rule on the site overrides it.
3. **Word shape.** Uniform advances remove the width variation that proportional
   type gives the saccade for free. This is a mechanism, not a citation — but it is
   the reason every long-form reading surface on the web is proportional.
4. **Faux bold.** The face ships one weight, so `.fact { font-weight: bold }`,
   `.timetag`, `.position`, `.keywords` (`global.css:292, 257-279`) are all
   browser-synthesised bold. It works, it is the recovered look, and it is worth
   naming as a constraint on where emphasis can go.

**Where mono is load-bearing and must stay.** Identity, and four functional roles:
the buttons and their hard-shadow blocks (`global.css:68-102`); the card badge
(`.listtitle`, `global.css:186-195`); dates and numbers — the facts progress bar is
already `font-variant-numeric: tabular-nums` (`global.css:297-299`), which mono
makes exact; and the terminal texture of the purple sheet itself. Necto Mono also
has **complete Finnish coverage** — ä, ö, Ä, Ö, – (en dash), — (em dash), ’, •, ·,
→, ←, é, € are all present at the same 610 advance, so the bilingual titles render
without a single fallback glyph.

### 1.5 Defects found while measuring — all citable, none cosmetic

| # | Defect | Citation | Effect |
|---|---|---|---|
| T1 | `.fact` fixed height overflows below ~600px | `global.css:290-295`; arithmetic in 1.3 | text collides with the widget's controls |
| T2 | `.listtitle` badge reused on the project detail meta line, `margin-top:-3rem` over the h1 | `[slug].astro:32`; `global.css:186-195` | date badge covers 69% of the title line |
| T3 | Print size is set on `body`, but the scale is in `rem` | `global.css:353-356` vs `:246-250`, `:290-295` | the 12px print override does **not** scale the CV section titles (24px) or facts (19.2px); it only catches inherited text |
| T4 | `PasswordGate.astro` references six tokens that do not exist: `--measure`, `--c-accent`, `--c-accent-muted`, `--c-whitebox-bg`, `--c-fg`, `--fs-small` | `PasswordGate.astro:81,94-96,101,106`; none defined in `tokens.css:12-98` | invalid-at-computed-value time: the input loses its border, the gate loses its max-width |
| T5 | `.btn` / `.btn--solid` are applied in four places and defined nowhere (the real class is `.button`) | `Facts.astro:37,40`, `cv.astro:86`, `PasswordGate.astro:66`; only `.button` exists (`global.css:68`) | the facts advance button, the gate submit button and the print button render unstyled |
| T6 | No `line-height`, no `hyphens`, no `lang` anywhere except `<html lang="en">` | grep of `rebuild/src`; `Layout.astro:37` | screen readers read Finnish titles with English rules; no hyphenation for compounds |
| T7 | Necto Mono has **no ∨** (U+2228) and no emoji; both are in shipped strings | font cmap vs `cv/recent-positions.yaml:25` ("Designer ∨ Developer"), `cv.astro:87` (🖨), `ProjectList.astro:63` (🔒) | per-glyph fallback inside a mono line breaks the 610-advance rhythm; emoji advance is double-width and shifts centred labels |
| T8 | `--c-ink-soft: rgba(0,0,0,0.6)` is defined; if it is ever used on the purple page it computes to **4.01:1** | `tokens.css:25`; computed §2.7 | below WCAG AA 4.5:1 for normal text on `--c-page` |
| T9 | Date ranges mix hyphen and en dash | `cv/education.yaml:5,23,32` ("2015 - 2019") vs `:14` ("2013 – 2013") and `cv/recent-positions.yaml:8` | typographic inconsistency in the most-scanned part of the CV |
| T10 | All 18 `publishedAt` are the placeholder `2020-01-01`, and the rebuild renders it | every `content/projects/*.md:5`; `[slug].astro:34`; `ProjectList.astro:29` sorts 18 ties | see `content-strategy.md` B1/B2 — a type layer cannot fix it, but it must not prettify it |

### 1.6 What is genuinely fine — do not touch it

1. **16px base.** Never set on screen (`tokens.css:45` comment is correct), so user
   zoom and browser font-size preferences both work. Keep the scale in `rem`.
2. **The 640px column.** 62–65 characters is inside band (§1.2). Widen the media,
   not the text: images and video may exceed the measure; prose should not.
3. **Black on white at 21:1.** `--c-ink: #000` on `--c-sheet: #fff`. AAA, twice over.
4. **Black on the purple page at 8.16:1** (computed from `#bc89ff`, luminance
   0.3581). Also AAA — the fixed back link (`global.css:133-138`) sits on the purple
   at desktop widths and is legible there.
5. **Underlined links**, inherited from the legacy `a { color:black; text-decoration:underline }`
   (`layout.css:10-13`, `global.css:28-31`). Colour-independent distinction — a real
   a11y property of the original worth preserving deliberately.
6. **`font-variant-numeric: tabular-nums`** on the progress readout
   (`global.css:297-299`). Correct, and it should be extended to CV dates.
7. **The white badge as a device.** On the *listing cards* it works: white plate,
   hard overlap with the image, mono. It is the detail-page misuse (T2) that has to
   go.
8. **The print block's structure.** Hiding the field, buttons and back link, the
   500px whitebox, `break-inside: avoid` on CV entries and the section page breaks
   (`global.css:353-395`) are all right. Only its size handling is wrong (T3).
9. **Reduced-motion discipline already exists.** Durations collapse to 1ms and
   `@view-transition` is disabled (`tokens.css:107-124`, `global.css:410-414,438-443`).
   Anything typographic that animates must use `--dur-*` so it inherits that for
   free.

---

## Part 2 — The type system

### 2.1 Families: keep the mono as display, add a proportional text face

**Decision: two families.** Necto Mono stays — as the *display and interface* face.
A proportional humanist sans becomes the *text* face for prose.

| Role | Face | Why |
|---|---|---|
| Display: h1, h2, h3, wordmark | **Necto Mono** | Identity. It is the site's one distinctive asset and it is strongest at 23px and up, where its quirks read as character rather than texture. |
| Interface: buttons, badges, meta lines, captions, back link, code, dates, progress | **Necto Mono** | Tabular by construction; the hard-shadow block buttons (`global.css:68-102`) are drawn from the same world. |
| Prose: project bodies, CV descriptions and bullets, bio, 404 | **IBM Plex Sans** (self-hosted, SIL OFL, `latin` + `latin-ext` woff2) | Longest strings on the site are prose: 235-character descriptions and 283-character bullets (`cv/*.yaml`). Plex is a humanist "designed-tech" sans that sits beside a quirky mono without fighting it, ships a true italic (the CV clients line is italic, `global.css:272-275`), and its metrics are stable across platforms. |

**Alternatives, honestly weighed.** *Source Sans 3* — larger glyph coverage, very
slightly narrower; a fine substitute if the owner prefers it. *Inter* — the most
legible option at small sizes but reads as a UI kit, which fights the brutalist
sheet. *System stack only* (`ui-sans-serif, system-ui, …`) — costs zero bytes and
zero self-hosting, and means the CV renders in Segoe UI on Windows, SF Pro on
macOS and Roboto on Android: three different pages for three audiences, and a
portfolio whose typography nobody chose. Recommended fallback *layer* either way:
put the system stack *after* the webfont so a failed download degrades to
something sane rather than to mono.

**The trade, stated plainly.** Keeping mono-only is defensible — it is braver and
it is the original. It costs ~20–25% more vertical space on the two reading
surfaces, 1.2 leading that no rule corrects, and the word-shape cues proportional
type gives for free. Adding a face costs ~30–45KB woff2 for one weight (~90KB
variable), one more self-hosted binary beside `rebuild/public/fonts/`, and the
discipline of a `font-family` swap in exactly two places. The owner's brief is
"improve readability"; the two surfaces that carry his professional argument — the
gated CV and the project bodies — are prose. **The pairing is the recommendation;
mono-only is a legitimate second choice and the rest of this spec still holds.**

**Loading.** `font-display: swap`; preload only the text face's regular weight (the
display face is already in the critical path and small); subset to `latin` +
`latin-ext` — the entire corpus's non-ASCII is **ä (U+00E4) and – (U+2013)** in
bodies and titles, plus ö/Ä/Ö/å in names, all inside that range.

**Fallback stacks for the glyphs Necto lacks** (defect T7), never by changing copy:

```css
--font-emoji: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji";
--font-symbol: "Apple Symbols", "Segoe UI Symbol", "Noto Sans Math", sans-serif;
```

`∨` in "Designer ∨ Developer" (`cv/recent-positions.yaml:25`) gets `--font-symbol`;
🔒 and 🖨 (`ProjectList.astro:63`, `cv.astro:87`) get `--font-emoji` at `0.9em`
inside their existing `role="img"` spans. The buttons already centre their label
with `inline-flex` + `gap` (`Button.astro:121-127`), which absorbs the double-width
emoji advance; the same must be true of any new centred label.

### 2.2 The scale — ratio 1.2 (minor third), base 16px

Named by role, expressed in `rem` (so browser default-size preferences and zoom
work) with px at the 16px baseline. Every step is the previous × 1.2 exactly.

| Token | rem | px | Step | Used for |
|---|---|---|---|---|
| `--fs-caption` | `0.833rem` | 13.3 | −1 | meta lines, captions, clients, badge small text. **Floor: nothing smaller on screen.** |
| `--fs-body` | `1rem` | 16.0 | 0 | prose, buttons, list titles |
| `--fs-lead` | `1.2rem` | 19.2 | +1 | deck/summary under a title, the bio lead, the fact revealer — **1.2rem is exactly the legacy `.fact` size** (`tokens.css:48`), so the most-seen new size is the old one |
| `--fs-h3` | `1.44rem` | 23.0 | +2 | card titles in a listing, CV entry position line |
| `--fs-h2` | `1.728rem` | 27.6 | +3 | section titles (CV sections, listing group headings) |
| `--fs-h1` | `2.074rem` | 33.2 | +4 | page titles |
| `--fs-display` | `2.488rem` | 39.8 | +5 | the home wordmark only (`index.astro:16`) |

Note the top step: the current h1 is the UA default **32px**; the new h1 is
**33.2px** — a 3.7% change. The redesign gains an entire scale *below* the h1
without changing what the page looks like at its most prominent size. That is
deliberate: the modernisation happens in the middle of the hierarchy, not at the
top.

**Fictional-scale guard.** `--fs-print` (12px) is not a step; it is a root-size
override (§2.8). No ad-hoc sizes: if a new element needs a size, it takes an
existing step.

### 2.3 Leading, measure, paragraph spacing, grid

```css
--lh-tight: 1.15;  /* display: h1, wordmark */
--lh-snug: 1.3;    /* h2, h3, card titles, CV entry headers, meta, labels */
--lh-body: 1.6;    /* all prose */
--lh-fact: 1.45;   /* the fact revealer — mono, centred, short */
```

Unitless values only, so user font-size scaling is not clamped. 1.6 replaces the
measured `normal` = 1.2 (§1.4) on prose; 1.15 keeps display sizes tight so headings
do not balloon at 33px mono.

**Measure, per family, in the unit that is honest for each:**

- Text face: `--measure-text: 34em` (≈544px at 16px ≈ 60–72 average characters).
  **`em`, not `ch`**: in a proportional face `ch` is the advance of the digit "0"
  (~0.6em) while average lowercase is ~0.5em, so `ch` over-counts by ~20%. Using
  `ch` here would silently produce a 75+ character column.
- Mono: `--measure-mono: 62ch`. Exact for Necto (610/1000 em, so 62ch = 605px —
  within 3px of today's 608px project column).
- Container: `max-width: min(100%, var(--measure-text))` on prose; media keeps the
  legacy `--measure-main: 640px` (`global.css:39`) so images and video may be wider
  than the text (§1.6.2).

**Acceptance criterion, measurable in a browser:** every prose paragraph on every
page wraps between **45 and 75 characters**. Verify at 1440px, 1024px and 375px.

**Paragraphs and headings.**

```css
p { margin-block: 0 1em; text-wrap: pretty; }     /* pretty is progressive */
p + p { margin-block-start: 0; }                   /* the legacy one-blank-line look */
h1, h2, h3 { text-wrap: balance; }
h1 { margin-block: 0 1.5rem; }
h2 { margin-block: 3.5rem 1rem; }
h3 { margin-block: 2rem 0.5rem; }
```

The 3.5rem above h2 preserves the airiness the CV section titles already have
(`.cvlisttitle { margin-top: 4rem }`, `global.css:246-250` — tightened by one space
step). `text-wrap: balance`/`pretty` are motion-free, degrade to normal wrapping,
and are the cheapest "modern" win available.

**Grid relation.** One column, left edge shared by h1, h2, h3, prose, lists and
media: `main` keeps `margin:auto; max-width:640px` and **drops
`text-align:center`** to `text-align: start`, with centring opted *into* the home
page (§2.9) and kept *inside* `.button` (`global.css:77` — a centred label in a
centred block is correct there). Justification, not taste: the two prose surfaces
already left-align (`global.css:206-210`, `:242-270`), so the site is already
inconsistently centred, and every page with a centred h1 over a left body makes
the reader re-anchor (§1.3). This is the one change in this document that visibly
departs from the recovered home page's composition, and it is registered in §4.

### 2.4 Bilingual content — Finnish and English

The corpus mixes languages in three places: Finnish project titles inside English
pages (`digitaalinenkirjallisuus.fi`, `Käkriäinen`, `Ilmastonmuuttajat – Climate
changers`, `Lukiovertailu – High school comparison`), Finnish proper nouns inside
English bodies (`karkkikammo`, `Veikkaus`, `Nuoren Voiman Liitto`), and the CV's
trilingual claim (`cv/other-skills.yaml:18`). Four requirements, in dependency
order:

1. **Script coverage is solved and must be preserved.** The only non-ASCII in the
   18 bodies and titles is **ä** and **–**; Necto Mono covers both at a uniform
   610 advance and any `latin`/`latin-ext` subset covers both. There is **no
   mixed-script metric problem in this corpus** — say so rather than designing for
   a CJK case that does not exist. The only real fallback risks are `∨` and emoji
   (T7, §2.1).
2. **`lang` attributes, because hyphenation depends on them.** `<html lang="en">`
   stays (`Layout.astro:37` — the site's language is English). Add an optional
   frontmatter field `titleLang: "fi"` to the projects collection
   (`content.config.ts:20-57`) and emit `<h1 lang="fi">` when present; mark
   Finnish *fragments* inside English text with `<span lang="fi">` in Markdown
   (raw HTML passes through Astro's Markdown renderer). Rule: mark **language
   text**, not established proper nouns — "Karkkikammo" is a name, "Ilmastonmuuttajat,
   a writing competition" is Finnish prose in an English sentence.
3. **Hyphenation, gated on (2).** `hyphens: auto` on `.project-block`, `.cvlist`
   and bio prose, plus `hyphenate-limit-chars: 6 3 3` as a progressive
   enhancement. `hyphens: auto` with `lang="fi"` uses Finnish hyphenation rules;
   with no `lang` it uses English rules on Finnish words, which is worse than
   nothing — **this is why (2) and (3) are one decision, not two.**
4. **Long tokens that hyphenation cannot fix.** At 375px the column is ~31 mono
   characters (26 at 320px), and the corpus contains genuinely unbreakable
   rendered strings: the h1 `digitaalinenkirjallisuus.fi` (27 characters) at
   display size is ~18 characters wide per line, and
   `https://www.exploreadministration.fi/` (`visualizing-government.md:26`) is a
   37-character bare URL. Required: `overflow-wrap: anywhere` on `h1` and on
   bare-URL links; `overflow-wrap: break-word` on `.listtitle`. (The 24
   "overflowing tokens" a raw-Markdown wrap simulation finds are mostly link
   *source* — `[text](url)` — and collapse to short anchor text on render; the
   three above are the real cases. Do not build defences for the other 21.)

### 2.5 Small screens — one breakpoint, kept

The original has exactly one breakpoint, `600px`, and an *empty* screen block
(`src/components/layout.css:106-108`); the only real small-screen rules in the
legacy are for `.projectVideo` (`src/pages/projectPage.css:19-25`). The rebuild
keeps `600px` as the parity breakpoint (`global.css:319-342`, per
`spec/gaps.md#G7`). Add to it:

| Change | Value | Why (all arithmetic in §1.3) |
|---|---|---|
| `.fact` height → min-height | `min-height: 3rem; height: auto` | fixes T1 — the only fix that works for all 37 facts at all widths |
| Padding step-down | `--pad-main: 1.25rem` below 400px (keep 2rem at 400–600px) | at 320px, 2rem padding leaves a 256px column = 26 mono characters, below the 45-character comfort floor; 1.25rem recovers 32px |
| Display sizes | `--fs-h1: clamp(1.728rem, 1.2rem + 2.6vw, 2.074rem)`; same treatment for `--fs-display` | a 33px mono h1 on a 311px column is 18 characters per line and forces `overflow-wrap` on every title |
| Badge overlap | `.listtitle { margin-top: -1.5rem }` below 600px | a 3rem overlap on a shorter image hides the image; the device survives at half depth |
| Back link | already static below 600px | `global.css:324-328` — keep |
| Body size | **never below 1rem** on any viewport | no viewport-scaled body text; zoom (WCAG 1.4.4) is the only shrink lever |

`clamp()` interpolates continuously, so 600px stays the only declared breakpoint
and mobile parity remains checkable at the same number.

### 2.6 Applying the system — what changes where

Concrete rules for `global.css`, expressed against the tokens in §2.10:

```css
body { font-family: var(--font-text); }               /* was: var(--font-mono) */
h1, h2, h3, .button, .listtitle, .fact, .timetag, .position,
.keywords, .caption, .backlink, .facts-progress, code, .project-meta {
  font-family: var(--font-display);
}
h1 { font-size: var(--fs-h1); line-height: var(--lh-tight); }
h2 { font-size: var(--fs-h2); line-height: var(--lh-snug); }
h3 { font-size: var(--fs-h3); line-height: var(--lh-snug); }
.project-block, .cvlist, .bio { line-height: var(--lh-body); hyphens: auto; }
.cvlistitem .timetag { font-variant-numeric: tabular-nums; }   /* extend T6 fix */
```

- **CV** becomes the surface that gains most: prose in the text face at
  `--lh-body`, dates in mono with tabular figures, `.position` at `--fs-h3`,
  `.cvlisttitle` at `--fs-h2`, one date-dash convention (`–` with spaces, T9) —
  and clients keep their italic (`global.css:272-275`), which is a genuine
  hierarchy signal the original already had.
- **Project pages**: title `h1` (mono), a new `.project-meta` class for the
  categories · date line (**replacing the `.listtitle` misuse, T2** — mono,
  `--fs-caption`, tabular numerals, no negative margin, no white plate), the body in
  the text face at `--measure-text`, media at 640px.
- **Listings**: card = thumbnail, then `.listtitle` badge (mono, `--fs-body`,
  left-aligned text inside a centred plate), optionally a `--fs-lead` deck from
  `summary` — **only after the 10 truncated summaries are rewritten**
  (`content-strategy.md` §1.3 B9); shipping them today renders broken text on 56%
  of cards.
- **Facts**: `.fact` at `--fs-lead`, `--lh-fact`, `text-align: start`,
  `min-height` (§2.5). Centring a 2–5 line paragraph at 19.2px was never right;
  the widget's own intro and progress line can stay centred if the home-adjacent
  composition wants them.
- **Password gate and print button**: fix T4 (retire `--measure`,
  `--c-accent-muted`, `--c-whitebox-bg`, `--c-fg`, `--fs-small`; use
  `--measure-text`, `--c-ink`, `--c-sheet`, `--c-ink-soft`) and T5 (`.btn` →
  `.button`), otherwise the new scale never reaches them.
- **404** (`404.astro:11`) and **about**: prose in the text face; the about caption
  at `--fs-caption` in mono.

### 2.7 Colour and contrast — hard constraints

| Token | Value | On `--c-sheet` #fff | On `--c-page` #bc89ff |
|---|---|---|---|
| `--c-ink` | `#000` | **21:1** (AAA) | **8.16:1** (AAA) |
| `--c-ink-soft` | `#3a3a3a` (replaces `rgba(0,0,0,0.6)`, `tokens.css:25`) | **11.4:1** (AAA) | **4.05:1** — **AA failure** |

Rules, not aspirations: **`--c-ink-soft` may only be used on the white sheet**
(`.whitebox` and the card plates), never on the purple page; on the purple page only
`--c-ink`. Links keep underlines (`global.css:28-31`) with
`text-decoration-thickness: 1px; text-underline-offset: 0.15em`. A single global
`:focus-visible` rule — `outline: 2px solid var(--c-ink); outline-offset: 2px` —
extends to all links and inputs, not just `.button:focus-visible`
(`global.css:95-98`); the ring is 21:1 against the sheet and 8.16:1 against the
page, so it meets WCAG 2.2's focus-appearance contrast on both surfaces. Nothing in
this spec may be justified by colour alone (WCAG 1.4.1): every distinction above is
also weight, size, face or underline.

### 2.8 Motion

Typography does not animate. There are no transitions on `font-size`,
`letter-spacing` or `text-wrap` in this spec, and none are permitted without
routed-through `--dur-*`, which already collapse to 1ms under
`prefers-reduced-motion` (`tokens.css:107-124`) — including the
`::view-transition` rules (`global.css:438-443`). `text-wrap: balance` and
`hyphens: auto` are static layout effects and are unaffected by the preference.

### 2.9 Print

- **Fix T3 by setting the root, not the body:** `@media print { :root { font-size: 12px } }`
  scales the whole `rem` ladder — the current `body { font-size: 12px !important }`
  (`global.css:353-356`) leaves `--fs-h2` (24px) and `--fs-lead` (19.2px) untouched,
  so the printed CV mixes 12px text with screen-sized headings today.
- At `:root` 12px, the 500px whitebox (`global.css:376-378`) holds ~68 mono
  characters and ~57 proportional ones — inside band; no measure change needed.
- Leading: `line-height: 1.35` in print (from `normal` = 1.2) — a CV at 9pt with
  1.2 leading is dense to the point of squinting, and the section page breaks
  (`global.css:387-389`) plus `break-inside: avoid` on entries
  (`global.css:391-394`) already control page count.
- Keep everything the legacy hides: `#background`, `.button`, `.backlink`,
  `.print-button` (`global.css:358-365`). Keep `@page { margin: 0 }`
  (`global.css:349-351`) only if the owner wants edge-to-edge; note it removes the
  printer's own margins and most drivers add ~10mm anyway.

### 2.10 Tokens — pasteable into `rebuild/src/styles/tokens.css`

Adds to, and where noted replaces, the existing block (`tokens.css:12-98`). Existing
space and motion tokens are unchanged.

```css
:root {
  /* ---- Families --------------------------------------------------------- */
  /* Display + interface: the identity face, kept (§1.6.3). One weight only —
     font-weight:700 on it is synthesised (§1.4). */
  --font-display: "Necto Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas,
    monospace;

  /* Text: prose only. SIL OFL, self-host, latin + latin-ext. The system stack
     behind it is the degradation path, not a second choice. */
  --font-text: "IBM Plex Sans", ui-sans-serif, system-ui, "Segoe UI", Roboto,
    Helvetica, Arial, sans-serif;

  /* Glyphs Necto Mono does not carry (defect T7): ∨ U+2228, 🔒, 🖨. */
  --font-emoji: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji";
  --font-symbol: "Apple Symbols", "Segoe UI Symbol", "Noto Sans Math", sans-serif;

  /* ---- Scale — ratio 1.2 from 16px, named by role (§2.2) ----------------- */
  --fs-caption: 0.833rem;  /* 13.3px — meta, captions, clients. Screen floor. */
  --fs-body: 1rem;         /* 16.0px — prose, buttons, card titles */
  --fs-lead: 1.2rem;       /* 19.2px — deck, bio lead, fact (legacy .fact size) */
  --fs-h3: 1.44rem;        /* 23.0px — CV entry position, card heading */
  --fs-h2: 1.728rem;       /* 27.6px — section titles */
  --fs-h1: 2.074rem;       /* 33.2px — page titles (legacy h1: 32px) */
  --fs-display: 2.488rem;  /* 39.8px — home wordmark only */

  /* Fluid display sizes; floor is one step down (§2.5). */
  --fs-h1-fluid: clamp(1.728rem, 1.2rem + 2.6vw, 2.074rem);
  --fs-display-fluid: clamp(2.074rem, 1.4rem + 3.4vw, 2.488rem);

  /* Print: a ROOT override, not a body override — rem steps scale with it
     (fixes defect T3, §2.8). */
  --fs-print-root: 12px;

  /* ---- Leading (§2.3) ---------------------------------------------------- */
  --lh-tight: 1.15;  /* display sizes */
  --lh-snug: 1.3;    /* headings, labels, meta, CV entry headers */
  --lh-body: 1.6;    /* all prose — replaces the measured `normal` = 1.2 */
  --lh-fact: 1.45;   /* fact revealer */

  /* ---- Measure (§2.3) ---------------------------------------------------- */
  --measure-text: 34em;     /* proportional prose ≈ 544px ≈ 60-72 chars.
                               em, NOT ch: in a proportional face ch measures the
                               digit and over-counts by ~20%. */
  --measure-mono: 62ch;     /* Necto: 1ch = 9.76px @16px → 605px ≈ legacy 608px */
  --measure-main: 640px;    /* kept: the column, and the media max */
  --measure-print-whitebox: 500px; /* kept: legacy @media print .whitebox */

  /* ---- Colour, with computed contrast (§2.7) ----------------------------- */
  --c-page: #bc89ff;      /* 8.16:1 with --c-ink. Purple page. */
  --c-sheet: #fff;        /* 21:1 with --c-ink. White sheet. */
  --c-ink: #000;          /* the ONLY ink permitted on --c-page */
  /* Replaces tokens.css:25. 11.4:1 on the sheet; 4.05:1 on the page — so
     sheet-only. A comment must travel with this token. */
  --c-ink-soft: #3a3a3a;

  /* Focus (§2.7) */
  --focus-ring: 2px solid var(--c-ink);
  --focus-offset: 2px;
}

/* Type breakpoints — 600px is the legacy parity breakpoint (spec/gaps.md#G7). */
@media screen and (max-width: 600px) {
  :root {
    --fs-h1: var(--fs-h1-fluid);
    --fs-display: var(--fs-display-fluid);
  }
}
@media screen and (max-width: 400px) {
  :root { --pad-main: 1.25rem; }  /* recovers 32px of column at 320px (§2.5) */
}

/* Print root — the whole rem ladder follows (§2.8). */
@media print {
  :root { font-size: var(--fs-print-root); }
}
```

---

## Part 3 — Information architecture

Twenty-five pages: `/`, `/work`, `/art`, `/about`, `/cv` (gated), `/404`, and 18
project pages. One change of shape per question.

### 3.1 Project bodies: keep Markdown prose, add a small optional meta block

**Keep Markdown.** The corpus is 18,189 body characters over 97 paragraphs — mean
186, median **67**. Most bodies are one to three short paragraphs plus a link list;
two promise "More content will follow, watch this space."
(`beyond-shape.md:26`, `ilmastonmuuttajat-climate-changers.md:16`). A
case-study scaffold — problem / approach / outcome, metrics, pull quotes — needs
material that is not here, and building the *slots* for it would invite copy that
does not exist. That fails the brief's hardest constraint.

**Add structure only where structure already exists in the text.** Six bodies carry
a literal `Process:` list (`ilmastonmuuttajat-climate-changers.md:20-24` —
"Process: / Visual design / Wordpress-development"; `eurovision-som.md`,
`beyond-shape.md`, `brb-email.md`, `instru-mental.md`, `stt-tarkkailija.md`
likewise), and several end with a "Have a look:" link list
(`kaekriaeinen.md:32-40`). Today these render as flat paragraphs indistinguishable
from prose. Proposal:

- Optional frontmatter on the projects collection (`content.config.ts:20-57`):
  `role: string`, `tools: string[]`, `links: { label: string; href: string }[]`,
  `bodyLang: "fi" | "en"` (§2.4). **Populated only from text the body already
  contains** — the `Process:` lines and the existing link lists. No field may be
  filled by inference.
- Rendered as a mono `.project-meta` definition list under the title, at
  `--fs-caption`, with tabular numerals — which is also where the categories · date
  line moves, retiring the `.listtitle` misuse (T2).
- `images[]` with dimensions stays exactly as it is (`content.config.ts:41-49`,
  `[slug].astro:60-72`) — reserving space is already correct and matters more while
  a shader repaints behind it.
- `summary` becomes the deck (listing card and project page lead) at `--fs-lead`,
  **gated on the 10 truncated fields being rewritten from the in-repo bodies**
  (`content-strategy.md` §1.3). Until then, do not render it — and do not delete it
  from the schema, or the rewrite loses its home.

### 3.2 `/work` and `/art`: order is broken, grouping should follow the content

**Ordering, as shipped:** `publishedAt` descending (`work.js:25`, `art.js:25`;
reproduced at `ProjectList.astro:29`) — but all 18 documents carry the placeholder
`2020-01-01` (`content/projects/*.md:5`), so the sort is a full set of ties and the
resulting order is collection-file order. The legacy chronological order survives
only in `extract/live/__listing_work.html`. See `content-strategy.md` §2.1/B2 for
the full argument and the three honest ways to recover the dates.

**Typographic recommendation, independent of how the dates are resolved:**

1. While dates are unverified: an explicit `order: number` per listing, mirroring
   the CV collection's existing `order` field (`content.config.ts:68`) —
   reviewable in a diff, and it cannot silently become a fake chronology.
2. Once dates are honest: group by year, reverse-chronological within year, with a
   `--fs-h2` mono year heading per group. A portfolio whose newest item is 2020
   reads as *a period* when the years are printed and as *a stopped feed* when they
   are not (`content-strategy.md` §2.2).
3. Every date renders in mono with `font-variant-numeric: tabular-nums`, at
   `--fs-caption`, as a year (`2015`), never as `YYYY-MM-DD`
   (`[slug].astro:34` currently prints a precision nobody has).

**Grouping.** Keep the `/work` ↔ `/art` partition for now: it is recovered
behaviour (`recovered.md#R1.3`), it is one prop on one component
(`ProjectList.astro:14-29`), and the build guard already fails the build for a
project matching neither filter (`astro.config.mjs:47-63`). `content-strategy.md`
§2.5 argues the *axis* is wrong — the corpus is unified by subject, not medium —
and that argument should be settled there, with the owner. Whichever axis wins, the
**format** is the same and is specified here: a single column of cards, each card
being thumbnail → badge (mono, `--fs-body`) → optional `--fs-lead` deck → year. One
format means reorganising is a sort, not a redesign.

**One redundancy to remove:** the badge prefix `{category}: {title} →`
(`ProjectList.astro:65`, recovered R1.4) repeats what the page has already said —
on `/art` every card is prefixed "Experiment:", on `/work` each says "Web" or
"Visualization". Recommend dropping the prefix on the listing and keeping the `→`
affordance and the agency lock glyph (`ProjectList.astro:63`); the category belongs
in `.project-meta` on the detail page. Register the departure (§4).

**Duplicates:** a project categorised both Web and Experiment appears on both pages
(`recovered.md#R1.3`). Keep — the pages are filters, not mutually exclusive sets —
and the card format being identical makes the repeat legible rather than confusing.

### 3.3 Home and about

**Home keeps what it is:** identity, route map, contact. It is a link hub
(`index.astro:16-47`) and that is a defensible shape; `content-strategy.md` §3.2
reaches the same conclusion and owns the copy questions. Typographically, home is
the site's one **centred poster**: the wordmark at `--fs-display` in mono, the
two-line intro at `--fs-lead`, and the button stack with centred labels
(`global.css:77`). Centring is opted into here and nowhere else (§2.3) — the
composition the owner recognises survives exactly where it was designed to exist.

**What moves to `/about`: the CV identity block.** `cv.astro:46-51` renders, from
`cv.js:19-21`:

> **Wolf Wikgren** / designer, developer, data analyst / interface, experience,
> data and visualization / helsinki, finland

That is the only self-description on the site, and today it is reachable only
behind the password prompt. `/about` has one sentence, a caption and the facts
widget (`about.astro:25-32`); `spec/gaps.md#G5` records that a bio was queried from
the CMS and never rendered, so there is no other candidate. Moving these four lines
onto `/about` as a `--fs-lead` block costs nothing, invents nothing, and gives the
public page the site's only professional self-description. `/cv` keeps its identity
block — the printed CV must be self-contained.

**Then `/about` becomes the one page with a bio-sized surface**, which is where the
owner-supplied prose identified in `content-strategy.md` §4.3 lands when it exists;
the type system already has a home for it (`--fs-body`, `--lh-body`,
`--measure-text`, `text-wrap: pretty`).

**Home additions are gated, not specified:** if dated evidence cards are added
(`content-strategy.md` §3.3), they reuse the listing card format at `--fs-h3` — no
new component, no new type step.

### 3.4 Page-type map

| Page type | Structure (top to bottom) |
|---|---|
| Home | wordmark h1 (mono, `--fs-display`, centred) · intro `--fs-lead` (centred) · button stack (mono labels, centred) · textlink |
| Listing (`/work`, `/art`) | h1 mono · optional group h2 (year) · cards: thumbnail, badge, deck, year · back link |
| Project | h1 mono (`overflow-wrap: anywhere`) · `.project-meta` mono `--fs-caption` · lead `--fs-lead` (summary, once repaired) · body in text face at `--measure-text` · images at 640px |
| About | h1 · lead `--fs-lead` (identity block, moved from `/cv`) · caption mono `--fs-caption` · facts (`.fact` `--fs-lead`, `min-height`) |
| CV | h1 · gated content · identity `--fs-body` mono · h2 sections `--fs-h2` · entries: date mono tabular `--fs-caption` → position mono `--fs-h3` → company `--fs-body` → description/bullets text face `--lh-body` → clients mono italic `--fs-caption` |
| 404 | h1 · one prose paragraph in the text face (`404.astro:11`), left-aligned |

**Heading outline, every page: exactly one h1, h2 for sections, h3 for items.** The
legacy project page's h1-less outline (`projectPage.js:18`) is already fixed in the
port (`[slug].astro:30`); this makes it a rule rather than an accident.

**Housekeeping, in scope because it is navigation:** `rebuild/src/pages/probe.astro`
is a dev-only shader probe (its own header comment). It must not ship to
production — exclude it from the build or mark it `noindex`; a public `/probe` is a
stray room in a 25-page house.

---

## Part 4 — Departure register and acceptance

Every change in this document that departs from recovered behaviour
(`spec/recovered.md`), so parity review can see exactly what was surrendered:

| | Departure | From | Justification |
|---|---|---|---|
| P1 | `main` loses `text-align:center`; centring is opt-in on home and inside buttons | `layout.css:21-28`, `global.css:37-44` | the two prose surfaces already left-align (`global.css:206-210`, `:242-270`); centred h1 over left body re-anchors the reader twice per page (§1.3) |
| P2 | Second family for prose | `recovered.md#R8.2` (single typeface) | the owner's brief is readability; mono stays as display and interface (§2.1) |
| P3 | Explicit scale, `line-height`, hyphenation, `lang` | none exist (§1.1) | additive |
| P4 | `.fact` loses its fixed 3rem height | `facts.module.css:1-6` | T1 — overflows by 67px at 375px |
| P5 | `.project-meta` replaces `.listtitle` on detail pages | `[slug].astro:32` + `global.css:186-195` | T2 — badge covers 69% of the title line |
| P6 | Print size moves from `body` to `:root` | `layout.css:134-136`, `global.css:353-356` | T3 — the current override misses every `rem` step |
| P7 | `--c-ink-soft` becomes `#3a3a3a` and is sheet-only | `tokens.css:25` | T8 — `rgba(0,0,0,0.6)` computes to 4.01:1 on the purple |
| P8 | Category prefix dropped from listing cards | `recovered.md#R1.4`, `listItem.js:11` | redundancy with the page's own filter (§3.2); `→` and lock retained |
| P9 | Date dash normalised to en dash across CV | `cv/education.yaml:5,23,32` | T9; presentation only, no copy change |
| P10 | Pad-main drops to 1.25rem below 400px | `layout.css:25`, `global.css:319-322` | 320px viewport otherwise yields 26 characters per line (§2.5) |

**Acceptance criteria — all checkable without judgement:**

1. Every prose paragraph wraps between **45 and 75 characters**, measured at 1440,
   1024 and 375px.
2. At 375px, revealing each of the 37 facts (`facts/wolf.json`) produces **no
   overlap** with the button or progress line.
3. On every project page, the date/meta line **does not intersect** the h1's box.
4. Printed `/cv`: one PDF, body text 12px-equivalent throughout including section
   titles, entries never split across a page break.
5. `axe` (or equivalent) reports **no contrast failures**; the focus ring is visible
   on every link, button and input on both the white sheet and the purple page.
6. `lang="fi"` is emitted for every project whose title is Finnish; `hyphens: auto`
   is active on prose and no hyphenated line breaks inside a proper noun.
7. No element anywhere uses a font size outside the named steps in §2.2.
8. With `prefers-reduced-motion: reduce`, the page is pixel-identical in its
   typography to the animated version (no animated type at all, §2.8).

**Open questions for the owner** — the ones this spec cannot answer; the rest are
in `content-strategy.md` Appendix A:

| # | Question | Gates |
|---|---|---|
| T-Q1 | Two families, or mono-only? (§2.1) | P2 — everything downstream |
| T-Q2 | If two families: IBM Plex Sans, Source Sans 3, or system stack? (~30–90KB either way) | font binaries in `rebuild/public/fonts/` |
| T-Q3 | Drop the `{category}:` card prefix? (§3.2) | P8 |
| T-Q4 | Keep home centred as specified, or left-align the whole site including home? (§2.3) | P1's scope |
| T-Q5 | Dates: Sanity export, inference, or no date at all? | the year-grouping in §3.2 and every card in §3.3 |
