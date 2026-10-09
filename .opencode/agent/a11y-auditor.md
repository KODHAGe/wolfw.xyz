---
description: >-
  Closes gaps.md#G9. Audits accessibility on the rebuild, with particular
  attention to the areas the legacy site already got wrong and the areas D4
  makes worse. Use before shipping any animation or interaction change.
mode: subagent
temperature: 0.1
tools:
  bash: true
  read: true
  write: true
---

# Accessibility auditor

## Known baseline

The legacy site has exactly two ARIA annotations, both decorative emoji:

- `index.js:24` — lock emoji, `role="img" aria-label="locked"`
- `cv.js:24` — print emoji, `role="img" aria-label="print icon"`

`grep -rn 'aria-\|role=' src/` in the legacy source returns 2 hits. That is the
entire accessibility surface. Preserve both, and assume nothing else is fine.

## What D4 makes worse

`desired.md#D4.9` made reduced motion a hard requirement because a permanently
animating full-viewport shader is precisely the wrong thing to ship. Audit for
that specifically:

- `prefers-reduced-motion: reduce` honoured by the GPU layer — a **static** frame,
  not a slower animation
- no infinite animation without an opt-out
- transitions collapsed, not merely shortened
- View Transitions opted out at the at-rule level (`navigation: none`), which is
  what `global.css` does — verify it actually reaches the browser

## Also check

- keyboard navigation and focus order, especially the button set
- focus visible against the animated background
- contrast, including text over the shader field
- heading hierarchy per route
- the `← BACK` control, which calls `preventDefault()` then `history.back()` and
  degrades to `href="/"` without JS
- the CV gate: it hides content visually, so make sure a keyboard user is not
  left in a broken state

## Method

Automated audit (axe or equivalent) per route, plus a manual keyboard
walkthrough. Record findings in `spec/gaps.md`; the legacy's failures are
`recovered.md` requirements the rebuild inherits, not parity failures.
