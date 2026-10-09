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

### D2.1 Migrate off Gatsby 2

**Origin:** derived · **Decision:** open

Gatsby 2 is 2019-era, on React 16, with a build pipeline that is slow enough to
consume meaningful free-tier build minutes. The repository has been frozen
since **March 2022** — the live site is a redeployment of four-and-a-half-year-old
code (see `gaps.md#G2`).

Vercel serves it reliably and will keep doing so. The framework is the risk, not
the host.

**Open question.** Gatsby is doing three distinct jobs here that a replacement
must cover separately: file-based routing, the build-time data layer, and
image optimisation. Only the first is easy.

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

### D4.1 Target: materially richer than current

**Origin:** owner · **Decision:** open

The site currently has effectively no animation beyond a randomly-parameterised
SVG sine-wave background (`recovered.md#R6`). Not yet specified what "more
advanced" means — this is the main open item in this document.

### D4.2 CSS scroll-driven animations and View Transitions, first

**Origin:** study · **Decision:** proposed

Cross-browser as of 2025–26, compositor-driven, zero JavaScript, and they live in
the repository as CSS — diffable and agent-editable. Covers scroll-linked
reveals, parallax, and cross-page transitions. Likely most of the requirement.

### D4.3 Animation assets stay text-based

**Origin:** study · **Decision:** proposed

The constraint inherited from the migration work: artifacts must remain text and
inspectable, or spec-as-source is lost.

- **Lottie / dotLottie** — open format, `.lottie` ~80% smaller than raw JSON,
  runtimes everywhere. Preferred for designer-authored vector animation.
- **Rive** — `.riv` is proprietary binary, dual-file (editable project plus
  compiled runtime), no open standard. Last resort. If used, it is an *asset*
  referenced from the spec, never a spec artifact.

Animation parameters live in spec data; renderers stay replaceable.

### D4.4 Reduced motion is a new obligation

**Origin:** derived · **Decision:** proposed

The current site has one media query at 600px and no motion handling
(`recovered.md#G8`, `gaps.md#G7`). D4.1 adds animation, which means adding
`prefers-reduced-motion` support. It is a requirement the legacy site does not
meet, so it belongs in the desired zone rather than being treated as parity.

### D4.5 Design tokens

**Origin:** study · **Decision:** open

285 lines of CSS are currently unspec'd (`gaps.md#G4`), and D4 needs animation
parameters to reference something. Extracting tokens serves both. Whether to do
it now or carry the CSS across and re-derive later is undecided.

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

1. **D4.1 — what does "more advanced visuals" mean?** The largest undefined
   item. Drives D4.2–D4.5 and most of Study 3.
2. **D2.1 — which framework replaces Gatsby 2?** Needs to satisfy routing, a
   build-time data layer, and image optimisation. Astro is the obvious candidate
   for a content site with minimal interactivity; the background animation is the
   feature most likely to argue against it.
3. **D1.2 — where do body images live**, and how are responsive variants made?
   Currently answered by Sanity's image CDN.
4. **D3.3 — does the private-project guard ship now or later?** Not critical
   today, but the guard is far cheaper to add alongside the content migration
   than to retrofit.
