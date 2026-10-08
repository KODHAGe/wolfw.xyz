# Content model — wolfw.xyz

Status: draft · Zone: **RECOVERED** (consumed contract)
Derived from `extract/pass-a/queries.md`. No model involved in this artifact.

This is the Sanity schema **as the code consumes it** — the projection of the CMS
onto what the site actually reads. It is not the CMS schema; that was never
fetched. See `gaps.md#G1`.

The distinction below is the useful part: fields *requested* but never *rendered*
are dead query surface, and they are the cheapest signal of intent drift in a
codebase this old.

---

## `sanityProjectWolf`

One type serves both listing pages and detail pages.

### Requested by

| Consumer | Line | Fields |
|---|---|---|
| `work.js` | 25–57 | `id`, `title`, `slug`, `publishedAt`, `author`, `mainImage`, `_rawBody`, `categories` |
| `art.js` | 25–57 | identical to `work.js` |
| `gatsby-node.js` | 11–36 | `title`, `slug`, `_rawBody`, `categories`, `mainVideo` |

### Rendered

| Field | Where | How |
|---|---|---|
| `id` | `list.js:12` | React key |
| `title` | `listItem.js:11` | card text; also `pageContext.title` → `<h2>` |
| `slug.current` | `listItem.js:9`, `gatsby-node.js:46` | route path, both as link target and page creation |
| `mainImage.asset.fluid` | `listItem.js:10` | `gatsby-image` fluid |
| `categories[0].title` | `listItem.js:11` | card prefix |
| `mainVideo.asset` | `projectPage.js:21` | Mux player `assetDocument` |
| `_rawBody` | `projectPage.js:33` | `BlockContent` |

### Requested but never rendered

- `publishedAt` — used only as a `sort` key (`work.js:25`, `art.js:25`), never displayed
- `author` (`id`, `name`) — requested at `work.js:36-39`, `art.js:36-39`; no
  component reads it
- `categories[].id` — requested, only `title` is used (`listItem.js:11`)
- `categories` inside `gatsby-node.js:19-22` — requested for page context,
  `projectPage.js` never touches it
- `_rawBody` in the listing queries — requested at `work.js:51`, `art.js:51`,
  passed to `List` via `list.js`, and never read; only the detail page renders it

**Read:** the listing queries are copies of each other and both carry a body
payload the list never uses. Roughly a third of requested listing fields are
dead weight. Harmless, but it means the queries were duplicated rather than
composed, and the duplication has drifted.

---

## `sanityAuthor`

### Requested by

`about.js:26-40`, filtered to `name: {eq: "Wolf"}`.

### Rendered

| Field | Where | How |
|---|---|---|
| `image.asset.fluid` | `about.js:18` | `gatsby-image` fluid, `maxWidth: 700` |

### Requested but never rendered

- `_rawBio` — requested at `about.js:28`, read nowhere. See `gaps.md#G5`.

---

## `mainVideo.asset`

The only integration with a third-party media service. `gatsby-node.js:26-34`
requests the full Mux asset shape and passes it through unchanged to
`sanity-mux-player`.

| Field | Purpose |
|---|---|
| `_key`, `_type` | Portable Text identity |
| `status` | Mux asset processing status |
| `assetId` | Mux asset identifier |
| `playbackId` | playback URL segment |
| `filename` | display |
| `thumbTime` | poster frame offset |

**Note.** `mainVideo` is optional — `projectPage.js:19` guards on it. Most
projects have none. `gaps.md#G3` covers what fraction.

---

## Derived site metadata

Not Sanity. A static block in `gatsby-config.js:2-6`, read by `seo.js:14-26`
through `useStaticQuery`.

| Key | Value |
|---|---|
| `title` | `wolfw.xyz` |
| `description` | `I am Wolf. I make (mainly) web happen - both beautiful and useful.` |
| `author` | `@KODHAGe` |

Consumed by `seo.js:28` (description fallback), `seo.js:36` (title template),
`seo.js:60` (`twitter:creator`).

---

## Content that lives in code, not in a CMS

Not part of the Sanity model. Full inventory in `extract/pass-a/content.md`.

| Content | Location | Volume |
|---|---|---|
| Home page copy and links | `index.js:10-27` | 1 title, 2 lines prose, 7 links |
| CV identity block | `cv.js:19-21` | name, 3 descriptor lines, location |
| CV history | `cvList.js:9-95` | 3 sections, 12 active entries, 2 commented out |
| Facts array | `facts.js:56-94` | 36 entries |

**This is the model's real shape.** Four of the site's five pages are backed by
CMS content; the identity-bearing content — everything a CV is *for* — is hardcoded
in JSX. A rebuild that preserves the current data architecture would preserve that
inversion.

---

## Open question for the rebuild

The site has two content systems that do not talk: Sanity for projects, JSX for
identity. Whether the rebuild unifies them is a `desired.md` decision, not a
`recovered.md` one. Recorded here because it is the most consequential structural
observation in this artifact.
