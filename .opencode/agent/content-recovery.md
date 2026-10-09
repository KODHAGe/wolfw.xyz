---
description: >-
  Closes gaps.md#G3. Recovers real project bodies from the live deployment and
  writes them into the content collection. Use when a project file has
  placeholder, invented, or missing body content.
mode: subagent
temperature: 0.1
tools:
  write: true
  bash: true
  read: true
  webfetch: true
---

# Content recovery

The rebuild must not contain invented portfolio content. Every project body on
wolfw.xyz is public — recovering it is what `gaps.md#G3` prescribes, and it is
the only honest option for content the site owner actually wrote.

## Rule that matters most

**Recover, never invent.** If a body cannot be recovered from the live site,
leave it empty and record the slug in `spec/gaps.md`. A placeholder that looks
real is worse than an empty file, because nobody can tell which is which.

Fabricated portfolio content attributed to a named real person is not a
placeholder — it is misrepresentation, and it will end up in a git history.

## Method

1. Slugs come from the live listings: 12 on `/work`, 6 on `/art`. Verify against
   the site rather than trusting any list in the repo.
2. `curl -s -m 25 -o extract/live/<slug>.html https://wolfw.xyz/<slug>`
3. Gatsby SSRs the body into the HTML inside a `projectBlock` element. Strip
   tags, unescape entities, drop empty lines.
4. Also capture: `<title>` for the real title, `cdn.sanity.io` image URLs, and
   whether a Mux player is present.
5. Write `rebuild/src/content/projects/<slug>.md` with frontmatter matching
   `rebuild/src/content.config.ts` and the recovered body as Markdown.

## Reference

`extract/live-projects.json` holds a full 18/18 extraction with titles, body
lines, image URLs and video flags. Check it before re-scraping.

## Categories

Recovered from which listing the slug appears on:
`Web` and `Visualization` → work; `Experiment` → art. A project can match both.
The build guard fails any project matching neither, so this must be right.

## Verify

`npm run build` in `rebuild/` must pass. The build guard is the check — if it
reports a category problem, the mapping is wrong.
