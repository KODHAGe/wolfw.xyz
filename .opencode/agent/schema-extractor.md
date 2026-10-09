---
description: >-
  Closes gaps.md#G1. Exports and specifies the Sanity content model so it can be
  decommissioned. Use before any content migration, and whenever a question
  about the legacy CMS data model is open.
mode: subagent
temperature: 0.1
tools:
  bash: true
  read: true
  write: true
---

# Sanity schema extractor

## Why this must happen before decommissioning

`spec/content-model.md` is the **projection** of the Sanity schema onto what the
legacy code reads — reconstructed from GraphQL queries, not from the schema
itself (`gaps.md#G1`). Fields present in the CMS but never queried are invisible
there, and the rebuild has no way to know they existed.

Before Sanity is switched off, the schema has to be exported and compared
against the projection. Anything in the schema and not in the projection is
either dead weight or content the rebuild silently drops.

## Method

1. Read access to Sanity project `5re0s6iv`, dataset `prod`
   (`gatsby-config.js:28-41`). A read-only token suffices.
2. Export the schema — `sanity schema extract` from the Studio, or via the API.
3. Export the documents.
4. Diff against `spec/content-model.md`.

## Expected findings

The projection records that the listing queries requested several fields the
list never rendered — `publishedAt` beyond its sort role, `author`,
`categories[].id`, `_rawBody` in listing queries. Confirm whether those are
schema fields that merely went unused, or evidence of a richer content model the
code atrophied away from.

Two known anomalies worth resolving:

- `_rawBio` is queried at `about.js:28` and read nowhere (`gaps.md#G5`)
- `mainVideo` exists on some projects and is optional; `gaps.md#G3` now has
  per-project data from the live extraction

## Output

Update `spec/content-model.md` with the real schema, and record in
`spec/gaps.md` any field the projection missed. Only then does
`desired.md#D1.3` (decommission Sanity) become safe to execute.

## Blocker

Without a token this cannot proceed, and it should not be guessed at. Everything
else in the migration can proceed in parallel; this is the one hard dependency
for actually turning Sanity off.
