# Recovered requirements — wolfw.xyz

Status: draft · Zone: **RECOVERED** (must be preserved)
Produced by Study 1. See `PLAN.md`.

Every requirement carries a citation. Two kinds:

- `file:line` — a static claim, verifiable by reading the source.
- `live:<path>` — a behavioural claim, verifiable against <https://wolfw.xyz>.

Claims marked **(gap)** are in `gaps.md` rather than asserted here. Claims
marked **(defect)** describe something broken: decide whether to fix or
replicate, but do not treat as intended behaviour.

---

## R1 — Content model

### R1.1 Sanity is the system of record for projects and author

Projects and the author bio are sourced from Sanity CMS, not from files in the
repo. *(defect: live dependency with no local fallback)*

- `gatsby-config.js:28-41` — `gatsby-source-sanity`, project `5re0s6iv`, dataset `prod`
- `gatsby-config.js:35` — read token from `process.env.MY_SANITY_TOKEN`
- `work.js:23-59`, `art.js:23-59`, `about.js:24-42` — GraphQL queries
- `live:/work` — 12 project cards render
- `live:/art` — 6 project cards render

### R1.2 Two Sanity document types are consumed

| Type | Consumed by | Fields the code actually reads |
|---|---|---|
| `sanityProjectWolf` | `work.js`, `art.js`, `gatsby-node.js` | `id`, `title`, `slug.current`, `publishedAt`, `author`, `mainImage`, `_rawBody`, `categories`, `mainVideo` |
| `sanityAuthor` | `about.js` | `name`, `_rawBio`, `image` |

- `work.js:25-57`, `art.js:25-57`, `gatsby-node.js:11-36`, `about.js:26-40`

### R1.3 Projects are partitioned by category, not by type

Both `/work` and `/art` render the same `sanityProjectWolf` type, filtered by
category membership. A project is on both pages if it matches both filters.

- `/work` — categories in `["Web", "Visualization"]`, sorted by `publishedAt` descending — `work.js:25`
- `/art` — category equals `"Experiment"`, sorted by `publishedAt` descending — `art.js:25`

### R1.4 Category title is used as the card prefix

Each card renders `{firstCategory}: {title} →` with a lock glyph prefix when
the title contains "agency" (case-insensitive).

- `listItem.js:11` — prefix + title + arrow
- `listItem.js:23-29` — `isAgency()` returns 🔒 if `title.toLowerCase().includes('agency')`

### R1.5 Author bio and image render on `/about`

Image renders via `gatsby-image` fluid at `maxWidth: 700`.

- `about.js:18` — `<Img fluid={data.sanityAuthor.image.asset.fluid}>`
- `about.js:35` — `fluid(maxWidth: 700)`
- **(gap)** — `_rawBio` is queried at `about.js:28` but no component in the repo
  renders it. Unclear whether this is dead query surface or the live site uses a
  Sanity-managed block renderer. See `gaps.md#bio-unused`.

---

## R2 — Routes

### R2.1 Static routes

| Route | Source | Protected |
|---|---|---|
| `/` | `index.js` | no |
| `/work` | `work.js` | no |
| `/art` | `art.js` | no |
| `/about` | `about.js` | no |
| `/cv` | `cv.js` | **yes** |
| `/404` | `404.js` | no |

- `live:/` 200, `live:/work` 200, `live:/art` 200, `live:/about` 200, `live:/nope` 404
- `gatsby-config.js:24` — `pagePaths: ['/cv', '/agency-work']`
- `live:/cv` — password form, not CV content

### R2.2 Dynamic route — one page per project

`gatsby-node.js` creates a page at `/{slug.current}` for every project with a
non-null slug, rendering `projectPage.js` with `slug`, `title`, `body` and
`video` passed via page context.

- `gatsby-node.js:11` — filter `slug.current.ne: null`
- `gatsby-node.js:46` — `const path = \`/${edge.node.slug.current}\``
- `gatsby-node.js:47-56` — `createPage` with context
- `live:/work` — 12 distinct project hrefs
- `live:/art` — 6 distinct project hrefs

### R2.3 Project pages render video and body when present

A project with `mainVideo` renders an autoplaying, muted, controls-hidden Mux
player. Body renders as Sanity block content at width 640.

- `projectPage.js:19-30` — video is conditional; `null` when absent
- `projectPage.js:20-26` — `autoplay`, `muted`, `showControls: false`
- `projectPage.js:32-37` — `BlockContent`, `imageOptions: {w: 640, fit: 'max'}`

### R2.4 Back links use history, not navigation

Every subpage renders a `← BACK` link that calls `preventDefault()` then
`window.history.back()`. `/` has no back link. The link's `href` is `/`, so
non-JS fallback still works.

- `about.js:11-16`, `work.js:10-15`, `art.js:10-15`, `cv.js:10-14`, `projectPage.js:12-17`
- `404.js` has no back link

---

## R3 — Home page content is hardcoded

`/` has no query and no Sanity data. All copy and links live in the component.

- `index.js:10` — `wolfw.xyz`
- `index.js:11-15` — "Hi, I'm Wolf W" / "I make web happen - both beautiful and useful."
- `index.js:19-22` — work, art, about, cv buttons (cv carries 🔒 with `aria-label="locked"`)
- `index.js:25` — github.com/KODHAGe, `target=_blank rel=noopener noreferrer`
- `index.js:26` — linkedin.com/in/wwwolf/, same target/rel
- `index.js:27` — `mailto:wolf@grh.fi`

`index.js:16-17` declares an empty `.contact` div — renders nothing.

---

## R4 — CV page

### R4.1 CV content is hardcoded in JSX, not data

Identity block is inline in `cv.js`; the position/education/skills history is
inline JSX in `cvList.js`.

- `cv.js:19-21` — name, roles ("designer, developer, data analyst"),
  focus areas, location
- `cvList.js:9-95` — full history

### R4.2 CV has three titled sections

1. Recent positions — `cvList.js:11`
2. Education — `cvList.js:72`
3. Other more/less relevant skills — `cvList.js:86`

Each entry carries dates, position, company, optional clients, optional
keywords, and a description body.

- `cvListItem.js:7-16` — the seven-field render
- `cvListItem.js:26-31` — all five string fields default to `""`

### R4.3 Two entries are commented out, not deleted

A 2012 internship at agency TWO and a GRH freelance role are present but
disabled in a JSX comment.

- `cvList.js:65-70` — both entries inside `{/* ... */}`

Preserve as recoverable content, not as rendered output.

### R4.4 Print affordance

A print button calls `window.print()`. The emoji carries
`role="img" aria-label="print icon"`.

- `cv.js:24`

---

## R5 — Password gate

> **Intent, confirmed by the site owner 2026-10-09.** The CV is not sensitive
> information. The gate is a **UX affordance** — "not every visitor needs to see
> this" — not a confidentiality control. It is not a defect that the content
> ships in a public JS bundle; that is the design working as intended.
>
> What this changes: R5 is a *mechanism to reproduce faithfully*, not a
> *weakness to fix*. But the guarantee a rebuild can honestly claim is
> "not rendered without a password", never "not readable".
>
> Note for the future (recorded in `desired.md`): if genuinely non-public
> client work is ever added, **client names live in the content**, not just the
> page — at which point UX-grade obscurity stops being sufficient and the
> approach has to change. Content-side hiding (not publishing the document) is
> the right first move, and it is enforceable — but only with a build-time
> guard, because on a static build a mistakenly-published private document
> ships silently.

### R5.1 Cookie-based, write-only

Submitting the password writes a cookie and reloads. There is no read-back
comparison on the client; the check happens server-side at request time.

- `PasswordProtect.js:13-17` — `preventDefault`, `setSessionPassword`, `window.location.reload()`
- `utils.js:4` — cookie name `gatsby-theme-password-protect`
- `utils.js:6-8` — `Cookies.set`, no validation
- `utils.js:10-12` — `getSessionPassword` exists but is unused in-repo

### R5.2 Partial matching, index page exempt

Protection uses `pathname.startsWith(path)` when `partialMatching` is set, but
skips matching entirely when `pathname === '/'`.

- `utils.js:19-30` — `isProtectedPage`
- `utils.js:23-25` — the index exemption
- `gatsby-config.js:23` — `partialMatching: true`

### R5.3 Gate copy and escape hatches

- `PasswordProtect.js:21` — "if you have a password you can enter"
- `PasswordProtect.js:30` — submit label "check it out"
- `PasswordProtect.js:33-35` — "back to the front page", `mailto:wolf@grh.fi` "ask for access"

### R5.4 A `?secret=` query parameter path exists

`getQueryPassword` parses `?secret=` from the location. Not referenced anywhere
else in the repo.

- `utils.js:14-17`
- **(gap)** — cannot tell whether the theme plugin consumes this server-side.
  See `gaps.md#query-password`.

### R5.5 The configured password is `undefined` (defect)

`gatsby-config.js` reads `GATSBY_NO_SECRET`. The deployment config defines
`NOT_VERY_SECRET`. The names do not match, so the theme receives `undefined`.

- `gatsby-config.js:22` — `password: process.env.GATSBY_NO_SECRET`
- `now.json:4` — `"NOT_VERY_SECRET": "@not_very_secret"`

**Not replicated.** The mechanism is intended; the broken env var name is not.
A rebuild must have a working password, or the gate blocks everyone permanently
— which defeats the UX purpose it exists to serve.

### R5.7 The gate provides no confidentiality — by design

The CV content ships in the page's public JavaScript bundle. Verified against
the live deployment:

- `live:/component---src-pages-cv-js-237d49fbf792f480e485.js` — 10,285 bytes
- Contains `State Treasury of Finland` verbatim, no password or cookie required

The gate decides what renders, not what is available. Confirmed intended — see
the note at the head of R5. Recorded here so that no future rebuild claims a
guarantee the original never made.

### R5.6 `/agency-work` is a stale protected path (defect)

Configured in `pagePaths` but present in neither the repo nor the live site.

- `gatsby-config.js:24`
- `live:/agency-work` — not reachable from any page

---

## R6 — Background

### R6.1 Full-viewport SVG sine-wave field, randomised per load

Seven `<g>` groups, each containing `gridSize` `<path>` elements. Each path is a
sine curve sampled at 1px steps. Positions are randomised around viewport centre
in `useLayoutEffect`, deliberately deferred to avoid an SSR mismatch.

- `background.js:23` — `<svg id="background">`
- `background.js:7` — `useLayoutEffect(() => setPositions(), [])`
- `background.js:8` — `browser` state gates rendering until positioned
- `background.js:12-18` — seven randomised positions
- `backgroundElement.js:47-59` — `createPath`, `Math.sin`, sampled `x += 1`
- `background.js:121-125` — `getRandomIntAround(value)` = random in `[0.5v, 1.5v]`

**Non-deterministic by design.** Specify as a behaviour with a distribution
over parameter ranges, not as fixed values. The random seed ranges are the
actual contract:

| Element | rotation | width | dasharray | frequency | amplitude | gridDistance | offset | gridSize | totalWidth |
|---|---|---|---|---|---|---|---|---|---|
| 0 `extra` | 80 | 10 | 100 | 100 | 60 | 0 | 7 | 1 | 200 |
| 1 `extwo` | −10 | 1 | 100 | 10 | 15 | 10 | 12 | 10 | 200 |
| 2 `exthree` | 20 | 1 | 100 | 2 | 15 | 10 | 200 | 7 | 240 |
| 3 `exfour` | 30 | 2 | 80 | 20 | 60 | 100 | 12 | 7 | 200 |
| 4 `exfive` | −180 | 8 | 10 | 120 | 20 | 0 | 7 | 2 | 240 |
| 5 `exsix` | −130 | 2 | 10 | 20 | 10 | 0 | 7 | 10 | 180 |
| 6 `exseven` | −45 | 1 | 10 | 10 | 20 | 10 | 1 | 6 | 200 |

*(all values ±50% via `getRandomIntAround` — `background.js:37-119`)*

### R6.2 Paths are grouped by dasharray stroke

- `backgroundElement.js:38-40` — `strokeDasharray`, `strokeWidth`, `strokeLinecap: round`
- `backgroundElement.js:43` — translate + rotate transform

### R6.3 Background renders on every page

`Layout` renders `<Background>` as a sibling of `<main>`, on all pages.

- `layout.js:13-14`

---

## R7 — Facts widget

A one-at-a-time fact revealer on `/about`. Clicking "get to know better" picks
a random unseen fact, shows it, and advances a 10-cell progress bar. When all
facts are exhausted the button becomes a mailto link and the message changes.

- `facts.js:11-29` — `update(max)`; `max` param is unused
- `facts.js:13-16` — rejection sampling to avoid repeats
- `facts.js:20-24` — `Math.floor(((progress.length - 1) / (facts.length - 1)) * 10)` cells
- `facts.js:26-27` — exhaustion branch
- `facts.js:37-41` — button/mailto swap
- `facts.js:42-46` — percentage readout

### R7.1 Facts content

37 facts in `facts.js:56-94`. Move to data, not JSX.

### R7.2 State mutation is direct (defect)

`progress.push(numba)` mutates the state array in place rather than producing a
new value. The author's own comment: `// okay man this is ugly`.

- `facts.js:17` — in-place mutation
- `facts.js:26` — the comment

### R7.3 Division by zero if only one fact exists (defect)

The percentage and bar computations divide by `facts.length - 1`. With a single
fact that is `/ 0`.

- `facts.js:20`, `facts.js:44`

The rebuild should handle `length === 1` without special-casing at every call
site.

---

## R8 — Layout and presentation

### R8.1 Two layout modes

`Layout` accepts a `whitebox` prop that toggles a class on `<main>`. Used by
`/about`, `/cv`, and the password gate. All other pages use the default.

- `layout.js:8-18` — `className={whitebox ? "whitebox" : ""}`
- `about.js:9`, `cv.js:9`, `PasswordProtect.js:20` — `whitebox="true"`

### R8.2 Single typeface

Necto Mono, self-hosted in `woff2` and `woff`.

- `fonts/fonts.css:1-7`
- `fonts/Necto-Mono.woff2`, `fonts/Necto-Mono.woff`

### R8.3 SEO component on every page except `/cv`'s heading order

`SEO` wraps `react-helmet`, reads site metadata via `useStaticQuery`, and emits
og/twitter/description meta. Title template is `%s | {siteTitle}`.

- `seo.js:13-73`
- `seo.js:36` — title template
- `gatsby-config.js:2-6` — siteMetadata

### R8.4 PWA manifest

Manifest with theme colour `#663399`, `display: minimal-ui`, nine icon sizes.

- `gatsby-config.js:52-63`
- `live:/manifest.webmanifest`
- `live:/` — link rel=icon for 48…512px

---

## R9 — Analytics (defect)

Google Analytics plugin targeting `UA-245054-12`, with `anonymize: true` and
`respectDNT: true`.

- `gatsby-config.js:9-17`
- `live:/` — includes google-analytics.com reference

Universal Analytics stopped processing data in 2024. This emits nothing and the
measurement ID format is obsolete. Decide on a replacement or removal; do not
replicate.

---

## R10 — Not requirements

Explicitly out of scope for a rebuild:

- `src/components/header.js` — upstream boilerplate, never imported
  (`extract/pass-a/components.md`)
- `index.js:16-17` — empty `.contact` div, renders nothing
- `cvList.js:1-2`, `cvListItem.js:1-2`, `cvListTitle.js:1-2`, `list.js:1-2`,
  `listItem.js:2` — commented-out `Link`/`PropTypes` imports
- `gatsby-plugin-offline` — in dependencies, not enabled in config
  (`gatsby-config.js:64-66`)
