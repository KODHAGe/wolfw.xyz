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

## Probe harness — built and working

`rebuild/src/pages/probe.astro` (dev server only, port 4322) imports the real
shader via `SHADERS` / `ELEMENTS` exports and reports numbers. It is the tool
this agent should use first.

```sh
cd rebuild && npx astro dev --port 4322   # then open /probe
```

## Narrowed state (2026-10-10) — fault is in the field math only

Established by measurement, not inference:

| Test | Result |
|---|---|
| WebGL2 context | **works** — ANGLE, Apple M1 Pro |
| `readPixels` round trip | **works** — clear-to-green returned `0,255,0,255` |
| Shader compile + link | **works** |
| Uniform locations | **all resolve**, including `u_p[0]` and `u_pos[0]` |
| `gl.getError()` after draw | **0** |
| Trivial fragment shader | **renders correctly** — `255,0,0,255` |
| Real fragment, `outColor = vec4(uv, 0.5, 1.0)` | **renders correctly** — clean gradient |

So the pipeline is sound and **the real fragment shader executes**. The defect
is confined to the field computation in `main()`.

## The actual anomaly

With the real `outColor = vec4(u_accent * acc, clamp(acc, 0.0, 1.0) * u_alpha)`
and `u_accent` set to `0.08`, the buffer reads back **255,255,255,255 on 100% of
pixels**.

`acc` is `max()` over products of `smoothstep` terms, each bounded to [0,1], so
`acc <= 1` and RGB should be at most `0.08` (≈20). Reaching 255 requires either
`acc` far above 1 — impossible by construction — or a **NaN**, which clamps to
1.0 in the write. NaN is the leading hypothesis.

NaN sources to check in `strokeAt` and `main`, in order of likelihood:

1. `mod(gg.x + t * 20.0 * ..., period)` with a large or zero `period`
2. `smoothstep(a, b, x)` where `a == b` or `a > b` — divides by zero
3. `sin(angle)` with `angle` driven very large by `q.x / freq` where `freq` is
   near its clamp floor of 1.0

Isolate by replacing the final write with individual terms:
`outColor = vec4(vec3(strokeAt(...)), 1.0)`, then `vec3(dashMask)`, then
`vec3(edge)`, and read back after each. Each is bounded, so the first one that
returns 255 is the culprit.

## Note

`u_pixelRatio` resolves to null — it is optimised out because the rewritten
pixel-space shader no longer uses it. Harmless, but remove the uniform rather
than leaving a dead declaration.

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
