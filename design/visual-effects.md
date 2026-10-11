# Visual effects — technical direction for the generative layer

**Role:** creative technologist, Study 3 (D4). This is direction, not implementation.
**Scope:** the background field (`rebuild/src/lib/background.ts`, `rebuild/src/components/Background.astro`),
the motion it may add, its colour, its interaction model, its budget, and its
failure behaviour. Button effects (D4.5) inherit the budget line only.

Everything below cites the code as it stands today; every measurement is real
and reproducible (method in §0). Nothing outside `design/` has been modified.

---

## 0. Method — what was measured, and how

`npm run build` succeeds — **but not with the machine's default Node**. The
repo's default `node` is v18.16.0 and Astro 5 refuses it ("Please upgrade … to
>=18.20.8"); the build below ran with Homebrew Node 23.10.0:

```
25 page(s) built in 947 ms
dist/_astro/Background.astro_astro_type_script_index_0_lang.*.js   11.36 kB │ gzip: 4.97 kB
```

Runtime numbers were taken in headless Chrome ("new"), **ANGLE Metal on the
Apple M1 Pro** in this machine (`WEBGL_debug_renderer_info`:
`ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro …)`), viewport 1440×900 CSS
at `deviceScaleFactor: 2`, driving the **real** `mountBackground()` by fetching
the Vite-transformed module from the dev server. Method notes that matter:

- `gl.finish()` does **not** synchronise in this headless path — it returned
  0.002 ms for a 5-megapixel draw, which is impossible. GPU kernel time below
  is `draw + readPixels(1×1)` (which forces a queue flush) minus a
  read-only baseline, averaged over K=200 draws.
- Ink coverage comes from the repo's own probe (`rebuild/src/pages/probe.astro`,
  driven headless at `/probe`), which uploads the parameter table with the
  shader's 9-float stride (probe.astro:61-69).

### Rewritten shader — measured, not estimated

The §2.2 shaders were extracted from this document, compiled and linked in a
real WebGL2 context (headless Chrome, ANGLE Metal), drawn with the R6.1 table
via `drawArraysInstanced(TRIANGLE_STRIP, 0, 482, 70)` (`gl.getError()` = 0),
and timed with the same sync method as the baseline:

| Quantity | Baseline (fullscreen SDF) | Rewritten (instanced strips) |
|---|---|---|
| Kernel per draw, 2872×1784 (DPR 2) | 5.58 ms | **1.54 ms** |
| Kernel per draw, 1436×892 (DPR 1) | 2.22 ms | **0.63 ms** |
| Cost model (same two-point fit) | ≈ 1.1 ms fixed + 0.88 ms/MP | ≈ 0.32 ms fixed + **0.24 ms/MP** |
| Ink coverage, 1436×892, incl. AA fringe | 0.49 % (1.30 % at DPR-2 feather) | **4.18 %** |

One fidelity note hides in that last row: the rewrite covers more pixels
because it is *more* faithful. The SDF measures **vertical** distance only
(`abs(q.y - y)`, `background.ts:151`), so steep curve sections — element 2's
2-px frequency has a slope near 24 — are under-stroked; SVG `strokeWidth` is a
**perpendicular** width. The strips expand along the true normal, so steep
segments now carry the stroke the SVG actually drew. Cost: 0.63 ms at DPR 1
for the correct geometry.

### Measured baseline (current shader, as shipped)

| Quantity | Value |
|---|---|
| GPU kernel per draw, full buffer 2864×1784 (5.11 MP, DPR 2) | **5.58 ms** |
| GPU kernel per draw, half buffer 1432×892 (1.28 MP, DPR 1-equivalent) | **2.22 ms** |
| Cost model (least squares on the two points) | ≈ 1.1 ms fixed + **0.88 ms per megapixel** |
| rAF frame interval while animating | p50 **16.7 ms**, p95 16.7 ms — vsync-locked |
| Ink coverage of that buffer (probe, correct upload) | **0.49 %** at DPR 1 fringe-included 1.30 % |
| Mount cost (compile + link) | 39 ms warm, **384 ms cold** |
| Colour buffer memory, DPR 2 | **19.5 MB** (2864×1784×4); double-buffered + compositor copy ⇒ ~40–60 MB GPU |
| Context loss, current code (no handlers exist) | `gl.getError()` = 37442 (`CONTEXT_LOST_WEBGL`), `readPixels` → `0,0,0,0`, `restoreContext()` refused → canvas permanently dead |

Two headline facts drive everything in §2 and §3:

1. **5.58 ms of a 16.7 ms frame — 33 % — is spent drawing a field that covers
   0.49 % of the pixels.** The fullscreen-quad SDF evaluates up to 70 stroke
   functions per pixel, for every pixel, and throws away ≥98.7 % of the result.
2. The loop is vsync-locked with zero headroom margin left for D4.5 buttons,
   D4.6 transitions, and page content compositing.

### Blocking defect found while reading (not caused by this proposal)

`background.ts:315-326` uploads the R6.1 table with **stride 8** (`Float32Array(56)`,
`const b = i * 8`, and it writes `e.grid` into the *gridDistance* slot, never
writing `gridDist` or any index ≥ 56), while the shader reads it with
**stride 9** (`background.ts:101-102` declares `STRIDE = 9`, `u_p[63]`;
`background.ts:176` uses `i * STRIDE`; `background.ts:186` reads `u_p[b+8]`).
Consequences: element 0's `total` reads an unwritten, zero-initialised slot, so
the bounds check (`background.ts:147`) rejects every pixel and element 0 is
**invisible**; elements 1-6 read parameter sets shifted by one field per
element — element 1 gets `width = 100` and `total = 1`, and so on. The probe
uploads correctly (`probe.astro:61-69`), which is likely why parity was
accepted against probe output while the mounted page disagrees with it.
**This must be fixed (one-line: stride 9 on upload, 63-float array, write
`e.gridDist` and `e.total`) before any of this design is evaluated visually** —
the numbers above were measured *with* the defect and are therefore, if
anything, an underestimate of the fixed cost, not an overestimate.

Minor citation drift, for the record: `tokens.css:96` cites the dash sweep as
"R6.3"; it is **R6.4** (`spec/recovered.md:335`). The brief cites
`gaps.md#G7` for "no reduced-motion handling"; G7 (`spec/gaps.md:132`) is the
responsive-breakpoint gap — the reduced-motion obligation is recorded inside
G9 at `spec/gaps.md:174`.

---

## 1. Where does the generative layer actually earn its place?

### The tension, stated exactly

R6.5 (`spec/recovered.md:360-385`) is unambiguous: the original strokes the
field at full opacity *over* the heading and intro copy, with no falloff and no
text-protection zone. The rebuild reproduces this deliberately
(`background.ts:239-248`, `u_alpha = 1.0` at `background.ts:352`). The owner's
brief is "improve readability", and the owner's override is that the shader
stays the **primary background**. R6.5's own closing note
(`spec/recovered.md:375-380`) says the legible version is a *desired* change
that belongs in `desired.md` — so this document is the correct home for the
departure, and the change must be recorded there as a D4.x decision when it
ships. It is not a quiet correction to recovered behaviour.

### Position: full-bleed field, local content plate — do not mask the field

Of the four options in the brief:

| Option | Verdict |
|---|---|
| Mask the field behind content in the shader (DOM rects → uniforms) | **Rejected.** Requires measuring every text node on load and resize, re-measures badly under View Transitions and Astro's client router, adds state the field doesn't need, and puts legibility logic in GLSL where a designer can't tune it. |
| Respond to scroll/mouse | **Adopted, narrowly** (see below). Pointer swell yes; scroll-driven motion no — the sheet is `position: fixed` (`Background.astro:26-36`), so scroll would only add parallax jitter on a site whose whole layout is one screen. |
| Replace sines with choropleths / SOM networks / approval-rating fields | **Rejected as background.** The portfolio *is* data visualisation, but rendering invented data-as-wallpaper on a data-visualisation portfolio reads as fake work — and inventing project content is banned outright. The scribble field is also the accepted parity identity. What *is* admissible: per-page **seeds** (the R6.1 randomisation reseeded from the page slug) so every page has its own field instance, and a palette drawn from the site's own two colours (§2). |
| Drive the field from real project imagery | **Deferred, kept as an option** — exactly where `desired.md:418` puts D4.8: after the D1 content migration, because it depends on `D1.2` image delivery (`content-model.md`). If it ships, it modulates stroke alpha from a 256² thumbnail luminance on project pages only (≈256 KB texture); it never replaces the field. |

**The mechanism: a content plate, not a field mask.** The field stays
full-bleed, full-alpha, and untouched across ~53 % of a 1440-px viewport
(`main` is `max-width: 640px`, `tokens.css:58`). The *content column* gets a
frosted plate — the drawing gets a plot area, which is the correct metaphor for
a data-visualisation portfolio:

```css
/* To land in global.css with the rest of the layout layer when approved.
   Generalises what main.whitebox already does (global.css:145-150). */
main {
  background: color-mix(in srgb, var(--c-sheet) 82%, transparent);
  backdrop-filter: blur(6px);
}
@supports not (backdrop-filter: blur(6px)) {
  main { background: color-mix(in srgb, var(--c-sheet) 94%, transparent); }
}
@media (prefers-reduced-transparency: reduce) {
  main { background: var(--c-sheet); }
}
```

The contrast bound is exact, not hopeful: 82 % white composite over a black
stroke has relative luminance ≈ 0.64, so **worst-case text contrast under the
plate is 13.8:1** — above AAA (7:1), while the strokes remain visibly present
at 18 % through the frost. Where no text sits, the field is untouched at full
ink. The composition changes from "the writing fights the drawing" to "the
writing is on vellum over the drawing" — same brutalist energy, readable.

Cost: zero GPU. `main` already sits at `z-index: 1` above the sheet
(`global.css:37-43`, `Layout.astro:64-70`); the plate is one background value
plus one compositor blur on a 640-px column.

### Interaction the field should own (the "respond" half)

- **Pointer swell.** Curves within ~140 CSS px of the cursor grow ~25 % in
  amplitude (vertex stage, §2). One uniform, lerped at 0.12/frame (~120 ms
  settle) — no listener work per event beyond storing a position.
- **No scroll response.** Fixed sheet, single-screen layout; parallax would be
  noise. (If content ever grows past one screen, revisit.)
- **Per-page seed.** The R6.1 distribution (`spec/recovered.md:312-322`) stays
  the contract; the seed changes per route, so `/work` and `/cv` are visibly
  different instances of the same species. This is the "meaningful to the work"
  answer that costs nothing and invents nothing.

---

## 2. What should it do in 2026? — positions, with reasons

### 2.1 Per-pixel SDF → instanced analytic curve geometry

The measured verdict is in §0: **0.49 % ink coverage for 5.58 ms of GPU.** The
cost model is `O(pixels × strokes)`; it should be `O(strokes × covered pixels)`.

**Position: the field becomes triangle-strip geometry, instanced — one draw
call, zero vertex buffers.** GLSL ES 3.00 gives `gl_InstanceID` and
`gl_VertexID`, so the strips need no attribute data at all — the current
fullscreen quad already proves the technique works here (`background.ts:57-63`
draws with no attributes enabled). Instance = element × 10 + grid row (7 × 10 =
70 instances; rows past `gridSize` degenerate off-screen exactly as the legacy
loop skipped them). 241 samples per curve at 1-px steps — matching
`createPath`'s original 1-px sampling (`spec/recovered.md:305`) — × 2 strip
sides = 482 vertices per instance, ≤ 33.7 k vertices per frame, one
`drawArraysInstanced(TRIANGLE_STRIP, 0, 482, 70)`.

The fragment stage survives, doing what fragments are actually good at:
antialiasing the strip edge, the dash mask, and the colour ramp — on the ~1 %
of pixels that carry ink.

**Compute: not now.** WebGL2 has none, and WebGPU compute would mean a second
GPU API beside the single-context rule (D4.11). The *architecture* below —
parameters as uniforms, behaviour-with-parameters as the contract — ports to
compute/WebGPU unchanged; that is the reason to keep the uniform contract
sacred. Record WebGPU as a later option, not a commitment
(same posture as D4.6's shader transition, `desired.md:289-293`).

**SDF, kept deliberately as tier B.** The existing quad shader already ships,
compiles and renders (`background.ts:69-249`). If the instanced program fails
to compile or link on some device, fall back to *it*, then to the CSS gradient
(§4.4). Three tiers, none of them black.

### 2.2 The GLSL (compiles under GLSL ES 3.00 — no non-constant globals)

```glsl
#version 300 es
// vertex — instanced sine strips. No attribute buffers: geometry comes from
// gl_VertexID / gl_InstanceID alone, exactly as the quad VERT gets its
// triangle from gl_VertexID (background.ts:57-63).
precision highp float;

uniform vec2  u_resolution;   // canvas size, DEVICE px
uniform float u_pixelRatio;
uniform float u_time;
uniform float u_reduced;      // 1.0 = static frame (D4.9)
uniform float u_pointerAmp;   // 0 = no pointer reactivity (reduced motion)
uniform vec2  u_pointer;      // CSS px, y-up like gl_FragCoord
uniform float u_p[63];        // R6.1 table, 7 elements x 9 fields — unchanged
uniform float u_pos[14];      // 7 x (x, y), CSS px from viewport centre

out float v_s;            // CSS px along the curve — the dash coordinate
out float v_dist;         // signed distance to centreline at the strip edge
flat out float v_half;    // half stroke width, CSS px
flat out float v_aa;      // antialias feather, CSS px
flat out float v_dash;    // this element's dasharray period

const int   ROWS     = 10;      // legacy gridSize ceiling
const int   SEG      = 240;     // samples per curve = legacy 1-px steps
const float TAU      = 6.28318530718;

float hash(float n) { return fract(n * 0.1031 + 0.1031); }
float dpr() { return max(u_pixelRatio, 1.0); }   // must stay a function: a
// uniform cannot initialise a global (GLSL ES 3.00), which fails silently.

void main() {
  int e = gl_InstanceID / ROWS;
  int r = gl_InstanceID % ROWS;
  int b = e * 9;

  float rotation = u_p[b + 0];
  float width    = u_p[b + 1];
  float dash     = u_p[b + 2];
  float freq     = max(u_p[b + 3], 1.0);
  float amp      = u_p[b + 4];
  float gridDist = u_p[b + 5];
  float offs     = u_p[b + 6];
  float gridSize = u_p[b + 7];
  float total    = u_p[b + 8];

  // Rows the legacy never drew, and any row of a broken upload: clip out.
  if (float(r) >= clamp(gridSize, 1.0, 10.0) || total <= 0.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    v_s = 0.0; v_dist = 0.0; v_half = 0.0; v_aa = 0.0; v_dash = 4.0;
    return;
  }

  int   vi   = gl_VertexID >> 1;
  float side = float((gl_VertexID & 1) * 2 - 1);
  float x    = (float(vi) / float(SEG)) * total;

  float t = u_reduced > 0.5 ? 0.0 : u_time;   // D4.9: the static frame is t = 0

  // Breathing rotation — same law as the quad shader (was background.ts:191).
  float spin = radians(rotation) + t * 0.05 * (hash(float(e) + 1.7) - 0.5);

  vec2 res  = u_resolution / dpr();           // CSS px, as in the quad shader
  vec2 pos  = res * 0.5 + vec2(u_pos[e * 2], -u_pos[e * 2 + 1]);

  // Pointer swell: +25 % amplitude within ~140 CSS px of the cursor.
  float top   = gridDist * float(r);
  float shift = offs * float(r);
  float ang0  = (x / freq) * TAU;
  float c0 = cos(-spin), s0 = sin(-spin);
  vec2 probe = vec2(x + shift, top + sin(ang0) * (amp * 0.5));
  probe = pos + vec2(probe.x * c0 - probe.y * s0, probe.x * s0 + probe.y * c0);
  float pd    = distance(probe, u_pointer);
  float swell = exp(-(pd * pd) / (19600.0)) * u_pointerAmp;
  float amp2  = amp * (1.0 + 0.25 * swell);

  // Same curve as createPath (backgroundElement.js:47): y from x, then the
  // row's horizontal stair added on emit — bounds semantics preserved by
  // construction, no per-pixel bounds check needed any more.
  float ang = (x / freq) * TAU;
  float y   = top + sin(ang) * (amp2 * 0.5);
  float dy  = cos(ang) * (TAU / freq) * (amp2 * 0.5);

  // Expand along the true normal, plus one device px of AA feather.
  vec2  nrm   = normalize(vec2(-dy, 1.0));
  float halfW = max(width * 0.5, 0.5);
  float aa    = 1.0 / dpr();
  vec2  lp    = vec2(x + shift, y) + nrm * side * (halfW + aa);

  vec2 world = pos + vec2(lp.x * c0 - lp.y * s0, lp.x * s0 + lp.y * c0);
  gl_Position = vec4((world / res) * 2.0 - 1.0, 0.0, 1.0);

  v_s    = x;
  v_dist = side * (halfW + aa);
  v_half = halfW;
  v_aa   = aa;
  v_dash = dash;
}
```

```glsl
#version 300 es
// fragment — antialias, dash, colour. Runs only on the ~1 % of pixels that
// carry ink: strips, not the screen, are what reach it.
precision highp float;

in float v_s;
in float v_dist;
flat in float v_half;
flat in float v_aa;
flat in float v_dash;

uniform vec3  u_field;        // --c-field  (ink)
uniform vec3  u_hot;          // --c-field-hot (brand purple)
uniform float u_alpha;
uniform float u_dashProgress; // 0..1 — the R6.4 one-shot sweep
uniform float u_dashTravel;   // 100.0 — the legacy keyframe's end value

out vec4 outColor;

void main() {
  float line = 1.0 - smoothstep(v_half, v_half + v_aa, abs(v_dist));
  if (line <= 0.0) discard;

  // R6.4 reimplemented as a UNIFORM one-shot sweep (recovered.md:335-358):
  // the dash pattern slides exactly one period over --dur-dash-sweep (5 s,
  // tokens.css:97), ease-in-out, and is HELD at the end — the shader-side
  // equivalent of `animation-fill-mode: forwards`. This replaces both the
  // missing u_dashProgress AND the current infinite drift at
  // background.ts:232, which is neither the recovered behaviour nor still.
  float period = max(v_dash, 4.0);
  float p      = clamp(u_dashProgress, 0.0, 1.0);
  float eased  = p * p * (3.0 - 2.0 * p);
  float phase  = u_dashTravel * eased;
  float m      = mod(v_s - phase, period);
  float dashMask = smoothstep(0.0, 1.0, period * 0.9 - m);  // same 0.45/0.45 shape as background.ts:231-233

  float a = line * dashMask * u_alpha;
  if (a <= 0.0) discard;

  // The sweep head is the site's own purple (tokens.css:21), fading to ink as
  // the sweep settles: the drawing is coloured in by the page, then goes to
  // ink. Colour is new — declared here, not smuggled into R6.
  float head = step(v_s, phase) * (1.0 - smoothstep(0.0, 60.0, phase - v_s));
  vec3  col  = mix(u_field, u_hot, head * (1.0 - eased));

  outColor = vec4(col * a, a);   // premultiplied — matches the context attrs
}
```

Both files keep the shape the probe expects: export them in `SHADERS`
(`background.ts:432`) alongside `ELEMENTS`, and keep `u_p[63]` / `u_pos[14]`
so `probe.astro`'s 9-stride upload (`probe.astro:61-69`) keeps working
unchanged. The R6.1 distribution table stays the single source of truth
(`recovered.md:308-322`) — behaviour-with-parameters survives again.

### 2.3 Colour: ink, plus one brand colour, plus nothing

Pure black at full alpha is parity (`backgroundElement.js` defaultProps, cited
at `background.ts:339-341`; `--c-field: #000` at `tokens.css:34`) and stays
the resting state. The addition is `--c-field-hot: #bc89ff` — **the site's own
page purple** (`tokens.css:21`), used only in the 60-px band behind the sweep
head (§2.2). Rationale: the two colours of the identity are purple-page /
white-sheet / ink-stroke; a purple sweep head makes the load animation read as
the site colouring its own drawing in. No third hue, no gradients in the
field, nothing derived from invented project data.

### 2.4 The dash sweep: reimplemented as a uniform. Not SVG. Not dropped.

- **Not preserved as SVG** — two renderers for one behaviour is exactly the
  spec-drift R6.4's correction note exists to prevent, and D4.4
  (`desired.md:247-255`) exists to end the CPU-SVG emulation.
- **Not dropped** — R6.4 is "the most visible motion in the site"
  (`recovered.md:337`); dropping it would be a bigger departure than
  re-tinting the field.
- **As a uniform**, driven in TS: `u_dashProgress` 0→1 over the existing
  `--dur-dash-sweep` token (`tokens.css:97`), then held. The TS driver is in
  §4.1. Note the current shader's continuous dash drift
  (`background.ts:232`, `t * 20.0 * (hash − 0.5)`) is an invention that runs
  forever; the sweep replaces it and stops that infinite motion for free.

### 2.5 Interaction, stated as uniforms

| Uniform | Driven by | Off when |
|---|---|---|
| `u_time` | rAF loop | reduced motion (`t = 0`, `background.ts:168` pattern kept) |
| `u_dashProgress` | rAF loop, one-shot | after 5 s (held at 1) |
| `u_pointer` + `u_pointerAmp` | `pointermove` (passive), lerped in loop | reduced motion (`u_pointerAmp = 0`) |
| future: thumbnail modulation texture | D4.8/D1.2, project pages | everywhere else |

Nothing else. No gyro, no scroll-jacking, no cursor trail. "Dreamy" is served
by the swell and the breathing, both of which are one multiply in the vertex
stage.

---

## 3. Performance budget — stated as numbers

All *measured* numbers are §0. The budget below is what the rewrite must meet,
re-measured with the same harness (`probe.astro` + the headless runner) before
this is called done.

### 3.1 The budget

| Quantity | Budget | Baseline (measured) | Rewrite (measured) |
|---|---|---|---|
| GPU kernel, background alone, 1440×900 @ DPR 2 | **≤ 2.0 ms/frame** | 5.58 ms | **1.54 ms** ✓ |
| GPU kernel at DPR 1 | ≤ 1.0 ms | 2.22 ms | **0.63 ms** ✓ |
| Whole WebGL context incl. D4.5 button effects | **≤ 3.0 ms/frame** | 5.58 ms + unmeasured | 1.54 ms + headroom |
| Draw calls per frame | **≤ 4** (1 clear + 1 instanced field; +1 if D4.8 texture modulation ships) | 1 | 1 |
| Vertex data | **0 bytes** — `gl_VertexID`/`gl_InstanceID` only | 0 | 0 |
| Uniform memory | **≈ 340 B** (77 floats) | ≈ 340 B | ≈ 340 B |
| Textures | **≤ 2 MB** total, none persistent (one 256² thumbnail per project page, if D4.8 ships) | 0 | 0 |
| Colour buffer | **≤ 19.5 MB** at DPR 2 (measured), ≤ 11 MB at the DPR-1.5 mobile tier | 19.5 MB | 19.5 MB |
| Shader compile+link (mount) | **≤ 100 ms** warm; must not block first paint (frame drawn immediately, as today at `background.ts:387-389`) | 39 ms warm / 384 ms cold | same program pipeline; re-measure on land |
| First frame with field | ≤ 1 rAF after mount | yes | yes |

### 3.2 DPR policy — verified, with one change

The cap exists and works: `Math.min(window.devicePixelRatio || 1, 2)` at
`background.ts:364`, recomputed in `resize()` on every frame
(`background.ts:376-382`) and on `ResizeObserver` (`background.ts:412-413`).
Keep the cap; add a floor policy: **DPR 2 on fine-pointer/desktop, DPR 1.5
default otherwise** (coarse pointer). The measured cost of the DPR-2 buffer is
3.36 ms/frame more than the DPR-1-equivalent one (5.58 vs 2.22) — the cap
currently buys little on the two most expensive screens.

### 3.3 Frame-time governor (the budget enforcing itself)

An EMA of the rAF delta, in the loop:

```ts
const TIERS = [2, 1.5, 1];          // DPR ladder
let tierIdx = 0, ema = 16.7, last = performance.now();

function frame(now: number) {
  if (!running) return;
  const dt = now - last; last = now;
  ema = ema * 0.9 + Math.min(dt, 100) * 0.1;

  if (ema > 20 && tierIdx < TIERS.length - 1 && dt < 100) {
    tierIdx++; resize();            // step DPR down, keep animating
  } else if (ema > 24 && tierIdx === TIERS.length - 1) {
    freeze(); return;               // D4.9's static frame, reused as the
  }                                 // blown-budget state: composition survives
  // ... draw with u_dashProgress, u_pointer, u_time ...
  raf = requestAnimationFrame(frame);
}
```

`freeze()` sets `data-perf="static"` on the canvas so CSS can reflect the
state, and draws one settled frame (`u_dashProgress = 1`, `u_time` frozen).
The fallback ladder is then: **instanced field → DPR step-down → static
frame → existing SDF quad (tier B) → CSS radial gradient**
(`Background.astro:45-51`). None rung is a black box — the white sheet
(`Background.astro:26-36`) is CSS and outlives any GPU failure.

### 3.4 M1 MacBook Air vs a 5-year-old Android

Measured on this machine's **M1 Pro**; the Air's GPU is ~2/3 of it on fill, so
expect ~8 ms/frame for the current shader there — a third of the frame budget
spent on wallpaper — against ~2.3 ms for the rewrite.

For a 2021 mid-range Android (Adreno 610/619 class: ~8–12 Gpx/s fill against
the M1 Pro's ~100+ Gpx/s ⇒ a **10–14× fill deficit**, stated as an
extrapolation, not a measurement):

- **Current shader at DPR 2:** 5.58 × ~12 ≈ 65–80 ms/frame ⇒ **11–15 fps.**
  Unusable, and the DPR cap alone does not save it (DPR 1.5 ≈ 3.6 ms ⇒ ~40 ms
  ⇒ 25 fps, still unusable).
- **Instanced rewrite (measured 1.54 ms at DPR 2 here):** ≈ 18–23 ms/frame at
  DPR 2 ⇒ 43–55 fps; at the coarse-pointer tier (DPR 1.5, ≈ 1.1 ms here)
  ≈ 13–16 ms ⇒ 60 fps. The governor (§3.3) exists to catch whatever a real
  device adds on top of this estimate.

This is the arithmetic that settles §2.1: not a 5× optimisation (it is 3.6×)
but the difference between shipping and not shipping the field on phones.

### 3.5 Pausing — verified, and one thing deliberately NOT added

- **`visibilitychange`: implemented and correct** — `background.ts:398-410`
  cancels rAF when hidden and restarts when visible with the `start` offset
  (`background.ts:406`) so time does not jump. Keep, and extend it to skip the
  restart when `reduced` (see §4.2).
- **IntersectionObserver: do not add.** The sheet is `position: fixed` with
  `inset` margins (`Background.astro:26-36`); it is by construction always
  intersecting the viewport, so an observer would never fire `false` and would
  cost a observer + callback for zero pauses. The correct pauses are hidden
  tab (done), reduced motion (done), and governor freeze (§3.3). If the layout
  ever becomes scrollable past one screen, this sentence is wrong and IO goes
  in.
- **Disposal on navigation: implemented** — `astro-before-swap` dispose
  (`Background.astro:63-68`) calls `WEBGL_lose_context.loseContext()`
  (`background.ts:415-420`), which is what keeps D4.11's one-context budget
  across client-router navigations. Keep.

---

## 4. Accessibility and robustness

### 4.1 Reduced motion — beyond the letter of D4.9

D4.9 (`desired.md:320-338`) requires a static frame, not a slow one, and the
mount path honours it (`background.ts:391-394`: one frame drawn, no rAF
scheduled; `u_time` zeroed at `background.ts:168`). Three gaps beyond it:

1. **Defect — toggling reduced motion mid-session never stops the loop.** The
   `change` listener (`background.ts:296-299`) only zeroes `start`; the rAF
   loop keeps redrawing an identical frame at 60 fps forever. Fixed by:

   ```ts
   motionQuery.addEventListener("change", (e) => {
     reduced = e.matches;
     gl.uniform1f(uReduced, reduced ? 1 : 0);
     if (reduced) {
       running = false;
       cancelAnimationFrame(raf);
       drawOnce(1);                    // settled state: sweep complete, static
     } else {
       start = performance.now();
       running = true;
       last = start;
       raf = requestAnimationFrame(frame);
     }
   });
   ```

2. **Reduced motion also means: no sweep, no swell, no breathing.** The static
   frame must be the *settled* frame — `u_dashProgress = 1`, `u_time = 0`,
   `u_pointerAmp = 0` — so the composition matches what everyone else sees
   after five seconds, with zero motion to get there. Under D4.9 this is a
   state, not a transition.
3. **Forced colours.** In `@media (forced-colors: active)` the ink field
   competes with user-forced text colours and its contrast is unknowable:

   ```css
   @media (forced-colors: active) {
     .sheet { display: none; }   /* the white sheet and canvas are decoration */
   }
   ```

Already handled elsewhere and verified while reading: CSS durations collapse
(`tokens.css:107-123`), view transitions opt out at the at-rule level
(`global.css:410-414`, `438-443`), and **print hides the canvas**
(`global.css:358-365`) — relevant to G10 (`spec/gaps.md:178`).

### 4.2 Context loss — currently unhandled, and measured to be fatal

Grep across `rebuild/` finds **no `webglcontextlost` or
`webglcontextrestored` handler anywhere**. The §0 measurement shows what that
means: after a loss (laptop GPU switch, driver reset, Chrome's own pressure
eviction), every GL call is a no-op (`gl.getError()` = 37442 =
`CONTEXT_LOST_WEBGL`), `readPixels` returns transparent black, and
`restoreContext()` is refused. On the real page the visitor sees the white
sheet — never a black box, thanks to `Background.astro:26-36` — but the field
is **dead until reload**, silently.

Two structural notes for whoever implements: `e.preventDefault()` on the lost
event is what *permits* the browser to attempt a restore; and the current code
creates the program once (`background.ts:276-289`) and captures every uniform
location in closure (`background.ts:307-357`), which cannot survive a restore —
so `initGL()` must be extracted and callable a second time. The shape:

```ts
// Inside mountBackground(), after canvas.getContext("webgl2", {...}):
let program: WebGLProgram;
let locs: Record<string, WebGLUniformLocation | null>;

function initGL() {                    // ALSO called on webglcontextrestored
  program = gl.createProgram()!;
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "link failed");
  }
  gl.useProgram(program);
  locs = { /* every location via the existing null-guarding loc() helper */ };
  uploadTable();                       // the R6.1 uniforms, stride 9 (see §0)
}

canvas.addEventListener("webglcontextlost", (e) => {
  e.preventDefault();                  // REQUIRED: without it no restore is attempted
  running = false;
  cancelAnimationFrame(raf);
});

canvas.addEventListener("webglcontextrestored", () => {
  try {
    initGL();                          // re-link, re-upload — locations are stale
    resize();
    drawOnce(reduced ? 1 : undefined); // one frame immediately (as background.ts:387-389)
    if (!reduced) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  } catch (err) {
    console.warn("[background] restore failed, falling back", err);
    canvas.dataset.fallback = "true";  // the CSS gradient — never a dead canvas
  }
});
```

Two restorances max, then `data-fallback = "true"` permanently for the page
visit. The existing no-WebGL2 and link-failure fallbacks
(`background.ts:271-274`, `background.ts:285-289`) already set the same
attribute and stay as-is.

### 4.3 Robustness summary — the invariant

**The invariant across every state is: the visitor sees the white sheet, or a
CSS gradient on it, or a static field, or the animated field.** Never black
(background is CSS, `Background.astro:26-36`), never a dead canvas without a
declared reason (`data-fallback`, `data-perf`).

---

## 5. Sequencing

1. **Fix the stride defect** (§0) — one upload-path change; without it no
   visual review of anything below is reviewing the real field.
2. Land §4.2 (context loss) and §4.1.1 (reduced-motion toggle) — pure
   robustness, no visual change.
3. Land the instanced rewrite (§2.1–2.2) with the R6.4 sweep and the purple
   head; re-run the harness; confirm the §3.1 budget.
4. Land the content plate (§1) — a CSS change, and the moment R6.5 is
   formally departed from, so it goes with its `desired.md` entry.
5. Governor (§3.3) and coarse-pointer DPR tier — before any button-effect
   work (D4.5) so the budget exists before it is spent. D4.5's own
   recommendation stands: start with the SVG gooey filter
   (`desired.md:275-279`), which costs zero context.
6. Per-page seed, thumbnail modulation — gated on D1.2/D4.8
   (`desired.md:418`).
