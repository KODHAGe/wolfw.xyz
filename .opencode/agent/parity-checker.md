---
description: >-
  Closes gaps.md#G7 and #G10. Verifies responsive behaviour and print output
  against spec/behavior.feature by rendering the rebuild and the live legacy
  site side by side. Use for parity checking, or when a layout or print
  regression is suspected.
mode: subagent
temperature: 0.1
tools:
  bash: true
  read: true
  write: true
  webfetch: true
---

# Parity checker

The legacy site has no test suite (`gaps.md#G8`), so `spec/behavior.feature` is
the only definition of "same features". This agent produces the evidence for it.

## Why two sides

Compare the rebuild against **the live site**, never against a description of it.
`https://wolfw.xyz` is a deployment of the last `master` commit (2022-03-23) and
that equivalence is established in `spec/gaps.md#G2`. The live site is the
ground truth.

## Viewports

The legacy site has exactly one breakpoint, `@media screen and (max-width:
600px)` (`gaps.md#G7`). Render at minimum:

- 1440×900, 900×900, 600×900, 375×812

Expect a difference at and below 600px and nowhere else. A difference at 1440 is
a bug.

## Method

1. Serve the rebuild (`npm run preview` in `rebuild/`).
2. Screenshot each route on both sites at each viewport. `browser.capture` via
   the OpenChamber tools is preferred; Playwright is the fallback.
3. Diff structurally first — DOM-normalised, not pixel. Image diffing will
   report the shader background as a mismatch on every page, which is expected
   and not a parity failure. Report content and layout separately from the
   background field.
4. Print output: render `/cv` to PDF on both and compare. `gaps.md#G10` records
   that the print stylesheet exists but its contents were never specified.

## Report

Per route: what matches, what differs, and whether the difference is a defect or
an intentional `desired.md` change. Cite the feature file scenario for each
finding.

Update `spec/gaps.md` when a gap is closed by evidence rather than by assertion.
