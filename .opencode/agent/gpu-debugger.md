---
description: >-
  Diagnoses the background shader, which compiles, links, uploads uniforms and
  draws — but produces no visible pixels. Use for D4.4, and for any WebGL or
  GLSL work in this repo.
mode: subagent
temperature: 0.2
tools:
  bash: true
  read: true
  write: true
---

# GPU / shader work

## Current state: broken, do not assume otherwise

`rebuild/src/lib/background.ts` compiles, links, resolves uniforms, draws one
frame at mount, and produces **no console errors and no visible output**.

## Already ruled out — do not re-investigate these

| Suspect | Finding |
|---|---|
| GLSL compile error | Fixed. `u_reduced` was declared `int` and compared against `0.5`; mixing int/float in a relational operator is a compile error in GLSL ES. It now compiles. |
| Uniform upload | Fixed. Array uniforms must be looked up as `"u_p[0]"`, not `"u_p"`. The wrong form returns null on some implementations and `uniform1fv` becomes a **silent no-op**, leaving every parameter zero so the bounds check rejected every pixel. Guarded by a `loc()` helper that warns. |
| Unbounded strokes | Fixed. Legacy parameters (`totalWidth` 180–240, `frequency` 2–120) are **pixel** values. Feeding them into normalised coordinates made `q.x > total` never fire, producing solid slabs. The shader now works in pixel space. |
| Accumulation | Fixed. `col +=` and `acc +=` across up to 70 strokes saturated the buffer. Now `acc = max(acc, line)`. |
| rAF not firing | Ruled out. A frame is now drawn immediately at mount, not deferred to the first `requestAnimationFrame`. |

## Where it stands

After those fixes the shader runs cleanly and draws nothing. Two remaining
suspects, both untested:

1. **Pixel space against a 2× DPR buffer.** `gl_FragCoord` and
   `canvas.width` should both be device pixels, but `resize()` uses
   `clientWidth * devicePixelRatio` while the CSS size is `100% × 100%`. Worth
   verifying that `gl_FragCoord` spans the expected range.
2. **The dash mask collapsing to zero.**
   `smoothstep(0.0, 1.0, period*0.45 - m + period*0.45)` where
   `m = mod(...)` in `[0, period)`. The argument ranges roughly
   `[-0.1*period, 0.9*period]`, so it is 0 for most of the period. If `line` is
   multiplied by this, the stroke may be almost entirely suppressed.

## Method — stop inferring from screenshots

Screenshots were the mistake here. Six capture-and-look cycles produced three
plausible-looking wrong diagnoses. Do this instead:

1. Render an unconditional `outColor = vec4(1.0, 0.0, 1.0, 1.0)` and confirm
   the canvas is magenta. If not, the problem is the pipeline, not the shader.
2. Read the buffer back with `gl.readPixels` at known coordinates and print the
   values. Get numbers, not images.
3. Then walk the field logic, printing `acc` at a test pixel.
4. Only once numbers confirm the path is live, tune the look.

## Constraints that do not relax

- **D4.11** — one shared WebGL context for the whole page. Do not open a second
  one; browsers cap contexts (commonly 16) and the failure mode is a black
  canvas, not an exception.
- **D4.9** — reduced motion renders a *static* frame. Not a slower one.
- The field must never compromise text legibility. It is a CV site. The earlier
  slab render buried the text and that was a failure, not a bold aesthetic.
- `data-fallback` must keep working. No WebGL2 means a CSS gradient, never a
  black box.

## Reference

`spec/recovered.md#R6.1` holds the legacy parameter table, and the shader's
uniforms are that table verbatim. The spec form is behaviour-with-parameters, so
tuning means changing the table or the falloff — not hard-coding pixels.
