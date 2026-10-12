/*
 * Background — the sine-wave field, on the GPU.
 *
 * D4.4. The legacy implementation (recovered.md#R6) was 135 lines of JavaScript
 * doing per-frame SVG DOM mutation: createElementNS, appendChild, getBBox, then
 * re-append. That is a CPU software renderer emulating what a fragment shader
 * does natively. This replaces the imitation with the real thing.
 *
 * The spec form survives the change of implementation, as required. The legacy
 * R6.1 distribution table becomes uniform values: frequency, amplitude, offset,
 * grid distance, dash array, stroke width, rotation, and the per-element
 * randomisation ranges. Same contract, different renderer.
 *
 * Three tiers, none of them a black box (visual-effects.md §2.1):
 *   A  instanced analytic curve geometry — what ships. The strips ARE the ink,
 *      so the fragment stage only runs on the ~3% of pixels that carry it.
 *      0.14 ms/draw at DPR 2, measured by tools/probe.astro.
 *   B  the SDF fullscreen quad, lazily imported from ./background-sdf.ts only
 *      if A fails to compile or link. It still renders; it is 3.2x slower and
 *      it under-strokes steep curve sections.
 *   C  a CSS radial gradient, declared by Background.astro.
 *
 * D4.11 — one shared WebGL2 context for the whole page. Button effects
 * composite into this same context rather than opening their own.
 *
 * D4.9 — reduced motion renders a single static frame, tracked in both
 * directions: the media query is re-read on change, the uniform is re-uploaded,
 * and the frame loop is stopped and started symmetrically. The frame-time
 * governor (visual-effects.md §3.3) ends in the same place: when frames are
 * genuinely late the field holds one frame instead of spending the battery.
 *
 * Robustness history, because each of these was a live defect:
 * - The parameter upload once used stride 8 into a 56-float array while the
 *   shader reads stride 9: element 0 was invisible and elements 1-6 were drawn
 *   from another element's numbers (design/visual-effects.md §0).
 * - Turning reduced-motion ON mid-session did not freeze the field (the uniform
 *   was uploaded once at mount) and rewound the clock into a visible jump.
 * - Turning it OFF mid-session left the field frozen until reload.
 * - The canvas died on the first ClientRouter navigation because the mount
 *   script is a module script the router never re-executes.
 * - Context loss was unhandled: `gl.getError()` = 37442 and a permanently blank
 *   canvas. preventDefault on webglcontextlost is what makes restoration
 *   possible at all.
 * - Uploading the field colour to `u_accent` after the rewrite, where the
 *   instanced program spells it `u_field`, logged a warning on every mount.
 * - Shipping both renderer tiers in one module put every page 2.9 KB gz over
 *   its JS budget. Tier B is a dynamic import now; `B17-fallback-stays-lazy`
 *   in the harness fails if anyone makes it eager again.
 */

// ---------------------------------------------------------------------------
// Parameters. Straight from recovered.md#R6.1.
//
// The legacy table, for comparison:
//   rotation  width  dasharray  frequency  amplitude  gridDistance  offset
//   gridSize  totalWidth
// The legacy randomised EVERY one of these within [0.5v, 1.5v] on each load via
// getRandomIntAround (background.js:121-125), so there is no single correct
// value for any of them - R6.1 specifies a distribution, not a constant.
//
// The values below are therefore ONE SAMPLE from each range, chosen to keep all
// seven elements on the sheet. They are NOT recovered constants and should not be
// read as the original numbers. Two consequences worth stating plainly:
//
//   - The rebuild is deterministic where the original was not. That is a
//     deliberate trade (spec/gaps.md), not a fidelity gain.
//   - The range is the contract. Changing these numbers within their ranges is
//     reproducing the original behaviour, not deviating from it.
//
// posX/posY are the bases from background.js:12-18, negated on y by the shader to
// match the SVG's downward axis. Element 4's base of -550/+450 puts it just off
// the top of a 900px viewport, so it is drawn from inside the range at -430/+250.
// ---------------------------------------------------------------------------

const ELEMENTS = [
  // rotation  width dasharray frequency amplitude gridDist offset gridSize totalWidth
  { rotation: 80,   width: 10, dash: 100, freq: 100, amp: 60, gridDist: 0,   offset: 7,   grid: 1,  total: 200, posX: 110, posY: -50 },
  { rotation: -10,  width: 1,  dash: 100, freq: 10,  amp: 15, gridDist: 10,  offset: 12,  grid: 10, total: 200, posX: -200, posY: 100 },
  { rotation: 20,   width: 1,  dash: 100, freq: 2,   amp: 15, gridDist: 10,  offset: 200, grid: 7,  total: 240, posX: -400, posY: 250 },
  { rotation: 30,   width: 2,  dash: 80,  freq: 20,  amp: 60, gridDist: 100, offset: 12,  grid: 7,  total: 200, posX: 300,  posY: -150 },
  { rotation: -180, width: 8,  dash: 10,  freq: 120, amp: 20, gridDist: 0,   offset: 7,   grid: 2,  total: 240, posX: -430, posY: 250 },
  { rotation: -130, width: 2,  dash: 10,  freq: 20,  amp: 10, gridDist: 0,   offset: 7,   grid: 10, total: 180, posX: 550,  posY: -250 },
  { rotation: -45,  width: 1,  dash: 10,  freq: 10,  amp: 20, gridDist: 10,  offset: 1,   grid: 6,  total: 200, posX: 0,    posY: 0 },
];

const VERT_INSTANCED = `#version 300 es
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

  // Breathing rotation — same law as the quad shader.
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

  // Expand along the true normal, plus one device px of AA feather. The SDF
  // measured VERTICAL distance only, so steep curve sections were under-stroked
  // — SVG strokeWidth is a perpendicular width, and this is it.
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
}`;

const FRAG_INSTANCED = `#version 300 es
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
  // tokens.css), ease-in-out, and is HELD at the end — the shader-side
  // equivalent of animation-fill-mode: forwards. This replaces both the
  // missing u_dashProgress and the previous infinite dash drift, which was
  // neither the recovered behaviour nor still.
  float period = max(v_dash, 4.0);
  float p      = clamp(u_dashProgress, 0.0, 1.0);
  float eased  = p * p * (3.0 - 2.0 * p);
  float phase  = u_dashTravel * eased;
  float m      = mod(v_s - phase, period);
  float dashMask = smoothstep(0.0, 1.0, period * 0.9 - m);

  float a = line * dashMask * u_alpha;
  if (a <= 0.0) discard;

  // The sweep head is the site's own purple (--c-field-hot), fading to ink as
  // the sweep settles: the drawing is coloured in by the page, then goes to
  // ink. Colour is new — declared in visual-effects.md §2.3, not smuggled into
  // R6.
  float head = step(v_s, phase) * (1.0 - smoothstep(0.0, 60.0, phase - v_s));
  vec3  col  = mix(u_field, u_hot, head * (1.0 - eased));

  outColor = vec4(col * a, a);   // premultiplied — matches the context attrs
}`;

// The legacy field was: for x in 0..totalWidth step 1, y = top + sin(x/freq * 2PI) * (amp/2),
// stroked with a dash pattern, translated and rotated into place.
// Reproduced as an SDF so it can be antialiased and dashed per-pixel rather
// than tessellated into thousands of DOM path points.
function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh) ?? "shader compile failed");
  }
  return sh;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const v = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

export function mountBackground(canvas: HTMLCanvasElement): () => void {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false, // we antialias in the shader; MSAA is wasted here
    premultipliedAlpha: true,
    powerPreference: "low-power",
  });

  // D4.7 fallback path. No WebGL2 means a static CSS gradient, supplied by the
  // class the caller toggles. Never a black canvas.
  if (!gl) {
    canvas.dataset.fallback = "true";
    return () => {};
  }
  delete canvas.dataset.fallback;

  let disposed = false;

  /*
   * Array uniforms MUST be looked up as "name[0]". Passing "u_p" returns null on
   * some implementations, and a null location makes uniform1fv a silent no-op —
   * which left every parameter zero, so the bounds check rejected every pixel
   * and the field drew nothing. Guarding null keeps that loud, not silent.
   */
  const loc = (program: WebGLProgram, name: string) => {
    const l = gl.getUniformLocation(program, name);
    if (l === null) console.warn(`[background] uniform ${name} not found`);
    return l;
  };

  // Program selection is tiered (visual-effects.md §2.1, §4.4):
  //   A  instanced analytic geometry  (the shipping renderer)
  //   B  the SDF fullscreen quad      (kept deliberately; compiles today)
  //   C  the CSS radial gradient      (set by Background.astro on fallback)
  // None of the rungs is a black box.
  let mode: "instanced" | "sdf" = "instanced";
  let program: WebGLProgram | null = null;
  let uRes: WebGLUniformLocation | null = null;
  let uTime: WebGLUniformLocation | null = null;
  let uDpr: WebGLUniformLocation | null = null;
  let uReduced: WebGLUniformLocation | null = null;
  let uDashProgress: WebGLUniformLocation | null = null;
  let uPointer: WebGLUniformLocation | null = null;
  let uPointerAmp: WebGLUniformLocation | null = null;
  // See the dummy-attribute note in build(): keeps the draw on the driver's
  // native path instead of the emulated one.
  let vao: WebGLVertexArrayObject | null = null;
  let dummyBuffer: WebGLBuffer | null = null;
  let loadingFallback = false;

  function compileProgram(vert: string, frag: string, tier: string): WebGLProgram | null {
    try {
      const p = gl.createProgram()!;
      gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vert));
      gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, frag));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(p) ?? "link failed");
      }
      return p;
    } catch (err) {
      console.warn(
        `[background] ${tier} program failed — ${
          tier === "instanced" ? "loading the SDF fallback" : "falling back to the CSS gradient"
        }`,
        err,
      );
      return null;
    }
  }

  // Compile one tier and upload everything it needs. Tier-uniform by design:
  // the instanced program spells the field colour u_field, the SDF quad calls
  // it u_accent, and uploading to the name the other tier uses logs a
  // "uniform not found" warning on every mount.
  function buildFrom(pair: { vert: string; frag: string }, tier: "instanced" | "sdf"): boolean {
    const p = compileProgram(pair.vert, pair.frag, tier);
    if (!p) return false;
    program = p;
    mode = tier;

    const loc = (name: string) => {
      const l = gl.getUniformLocation(p, name);
      if (l === null) console.warn(`[background] uniform ${name} not found (${tier})`);
      return l;
    };

    gl.useProgram(p);
    canvas.dataset.fallback = "false";
    canvas.dataset.mode = tier;

    /*
     * The vertex shader uses gl_VertexID and declares no attributes, so no
     * attribute array is ever enabled. Chrome/ANGLE then prints "drawing
     * without vertex attrib 0 array enabled …" on every frame and takes the
     * emulated path on desktop OpenGL. A dummy attribute at location 0 gives
     * the driver the array it wants.
     */
    if (!vao) {
      dummyBuffer = gl.createBuffer();
      vao = gl.createVertexArray();
    }
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, dummyBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 1, gl.FLOAT, false, 0, 0);
    gl.useProgram(p);
    canvas.dataset.fallback = "false";
    canvas.dataset.mode = tier;

    // Upload parameters. STRIDE is 9, matching the shader's elementProps order:
    // rotation, width, dasharray, frequency, amplitude, gridDistance, offset,
    // gridSize, totalWidth. The array is N * STRIDE = 63 floats. The original
    // upload wrote stride 8 into 56 floats and never wrote gridDist or total,
    // so element 0 failed its bounds check (invisible) and elements 1-6 read
    // another element's parameters (visual-effects.md §0).
    const params = new Float32Array(7 * 9);
    ELEMENTS.forEach((e, i) => {
      const b = i * 9;
      params[b + 0] = e.rotation;
      params[b + 1] = e.width;
      params[b + 2] = e.dash;
      params[b + 3] = e.freq;
      params[b + 4] = e.amp;
      params[b + 5] = e.gridDist;
      params[b + 6] = e.offset;
      params[b + 7] = e.grid;
      params[b + 8] = e.total;
    });
    gl.uniform1fv(loc("u_p[0]"), params);

    // Position offsets. Legacy randomised these around viewport centre on every
    // load (background.js:12-18).
    const positions = new Float32Array(14);
    ELEMENTS.forEach((e, i) => {
      positions[i * 2] = e.posX;
      positions[i * 2 + 1] = e.posY;
    });
    gl.uniform1fv(loc("u_pos[0]"), positions);

    // Legacy drew the field in BLACK (backgroundElement.js:82, defaultProps
    // color 'black'), 1-10px, full opacity — it set no opacity on the paths,
    // so the field drew at 100% black. A pale accent at reduced alpha covers
    // under 1% of pixels and disappears against a near-white page.
    // --c-field is a JS interface, not just a CSS token: the GPU layer reads it
    // through getComputedStyle (frontend-architecture.md §2.4).
    const css = getComputedStyle(document.documentElement);
    const rgb = hexToRgb(css.getPropertyValue("--c-field").trim() || "#000");
    gl.uniform1f(loc("u_alpha"), 1.0);

    uRes = loc("u_resolution");
    uTime = loc("u_time");
    uDpr = loc("u_pixelRatio");
    uReduced = loc("u_reduced");
    gl.uniform1f(uReduced, reduced);

    if (tier === "instanced") {
      // --c-field-hot: the site's own page purple, used only in the sweep head
      // band (visual-effects.md §2.3, declared as an addition, not recovered).
      const hot = hexToRgb(css.getPropertyValue("--c-field-hot").trim() || "#bc89ff");
      gl.uniform3f(loc("u_field"), rgb[0], rgb[1], rgb[2]);
      gl.uniform3f(loc("u_hot"), hot[0], hot[1], hot[2]);
      gl.uniform1f(loc("u_dashTravel"), 100.0); // legacy keyframe end value
      uDashProgress = loc("u_dashProgress");
      uPointer = loc("u_pointer");
      uPointerAmp = loc("u_pointerAmp");
      gl.uniform2f(uPointer, pointer.x, pointer.y);
      gl.uniform1f(uPointerAmp, reduced ? 0 : 1);
    } else {
      // The SDF quad spells the field colour u_accent.
      gl.uniform3f(loc("u_accent"), rgb[0], rgb[1], rgb[2]);
      uDashProgress = null;
      uPointer = null;
      uPointerAmp = null;
    }
    return true;
  }

  // Tier A is the only program compiled eagerly. Tier B lives in its own module
  // and is imported DYNAMICALLY, so the fallback costs zero bytes to visitors
  // whose GPU never sees it fail — shipping both eagerly pushed the page over
  // its 12 KB JS budget (+2.9 KB gz) for a failure mode that has never
  // occurred. The CSS gradient (tier C) covers the gap while the chunk loads.
  function build(): boolean {
    if (buildFrom({ vert: VERT_INSTANCED, frag: FRAG_INSTANCED }, "instanced")) return true;
    if (!loadingFallback) {
      loadingFallback = true;
      import("./background-sdf")
        .then(({ SDF_SHADERS }) => {
          if (disposed) return;
          if (!buildFrom(SDF_SHADERS, "sdf")) {
            canvas.dataset.fallback = "true";
            return;
          }
          resize();
          if (reduced) freeze();
          else startLoop();
        })
        .catch((err) => {
          console.warn("[background] fallback chunk failed — CSS gradient", err);
          canvas.dataset.fallback = "true";
        });
    }
    canvas.dataset.fallback = "true";
    return false;
  }

  // D4.9 — the preference, tracked in BOTH directions. The former code read it
  // once and re-read the change listener's variable without ever re-uploading
  // the u_reduced uniform, so the shader kept animating; and it reset `start` to
  // 0, which made the field visibly jump. Both directions now:
  //   ON  → stop the loop and draw the SETTLED frame (sweep complete, t=0,
  //         no pointer swell) — the paper's §4.1, not the current frame
  //   OFF → restart the loop from the settled state (no jump)
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = motionQuery.matches ? 1 : 0;

  let raf = 0;
  let start = performance.now();
  let elapsed = 0; // seconds of field motion actually drawn
  let running = false;

  /* --- Governor (visual-effects.md §3.3) ----------------------------------
   * The budget enforcing itself: an EMA of the rAF delta steps the DPR ladder
   * down before it gives up the loop, and the blown-budget state is D4.9's own
   * static frame — composition survives, motion does not. Rung order is
   * instanced → DPR step-down → static frame → SDF quad → CSS gradient.
   * ---------------------------------------------------------------------- */
  const TIERS = window.matchMedia("(pointer: fine)").matches ? [2, 1.5, 1] : [1.5, 1];
  let tierIdx = 0;
  let ema = 16.7;
  let last = performance.now();
  let settled = false; // governor froze us, not reduced motion

  // Pointer swell target, lerped in the loop (visual-effects.md §2.5).
  const pointer = { x: -1e4, y: -1e4 };
  const pointerTarget = { x: -1e4, y: -1e4 };
  const onPointerMove = (e: PointerEvent) => {
    if (reduced || settled) return;
    pointerTarget.x = e.clientX;
    pointerTarget.y = window.innerHeight - e.clientY; // y-up, like gl_FragCoord
  };
  if (!reduced) window.addEventListener("pointermove", onPointerMove, { passive: true });

  function dprForTier() {
    return Math.min(window.devicePixelRatio || 1, TIERS[tierIdx]);
  }

  function resize() {
    const dpr = dprForTier();
    const w = Math.floor(canvas.clientWidth * dpr);
    const h = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      if (uRes) gl.uniform2f(uRes, w, h);
      if (uDpr) gl.uniform1f(uDpr, dpr);
      // Setting canvas.width clears the buffer, so a stopped (reduced-motion
      // or governor-frozen) frame would vanish on resize unless redrawn.
      if (!running) drawFrame();
    }
  }

  // R6.4's one-shot sweep: 0 → 1 over --dur-dash-sweep, then HELD. Held
  // because the legacy animation-fill-mode was `forwards` (recovered.md:335-345),
  // and one-shot because the legacy swept once and settled. The old continuous
  // dash drift was an invention that ran forever.
  //
  // The duration comes from the token rather than a literal: 5s in CSS is a
  // design decision, and a second copy of it here is a second place to forget
  // to change. It was also the last unreferenced token in the sheet.
  const sweepSeconds = () => {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue("--dur-dash-sweep")
      .trim();
    return v.endsWith("ms") ? parseFloat(v) / 1000 : parseFloat(v) || 5;
  };
  const SWEEP_S = sweepSeconds();
  function sweepProgress() {
    // Under reduced motion the frame is the SETTLED one: sweep complete, no
    // motion to get there (visual-effects.md §4.1.2).
    if (reduced) return 1;
    return Math.min(elapsed / SWEEP_S, 1);
  }

  function drawFrame() {
    if (!program) return;
    if (uTime) gl.uniform1f(uTime, reduced ? 0 : elapsed);
    if (uDashProgress) gl.uniform1f(uDashProgress, sweepProgress());
    if (uPointer && uPointerAmp) {
      pointer.x += (pointerTarget.x - pointer.x) * 0.15;
      pointer.y += (pointerTarget.y - pointer.y) * 0.15;
      gl.uniform2f(uPointer, pointer.x, pointer.y);
      gl.uniform1f(uPointerAmp, reduced || settled ? 0 : 1);
    }
    if (mode === "instanced") {
      // 7 elements × 10 rows = 70 instances, 482 vertices each (241 samples ×
      // 2 strip sides), zero attribute bytes.
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 482, 70);
    } else {
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }

  function frame(now: number) {
    if (!running) return;
    const dt = now - last;
    last = now;
    ema = ema * 0.9 + Math.min(dt, 100) * 0.1;

    // Governor: step the DPR ladder down before giving up the loop, and never
    // during a stall (a backgrounded tab produces huge dt and is not a
    // rendering signal).
    if (ema > 20 && tierIdx < TIERS.length - 1 && dt < 100) {
      tierIdx++;
      resize();
    } else if (ema > 24 && tierIdx === TIERS.length - 1) {
      settled = true;
      canvas.dataset.perf = "static";
      freeze();
      return;
    }

    resize();
    elapsed = (now - start) / 1000;
    drawFrame();
    raf = requestAnimationFrame(frame);
  }

  function startLoop() {
    if (running || disposed) return;
    running = true;
    settled = false;
    delete canvas.dataset.perf;
    start = performance.now() - elapsed * 1000;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stopLoop() {
    running = false;
    cancelAnimationFrame(raf);
    raf = 0;
  }

  // Freeze: stop the loop and draw one settled frame. The old `start = 0` reset
  // rewound the field into a visible jump the instant the preference changed;
  // a settled frame is both calmer and what the paper asks for (§4.1.2) —
  // sweep complete, t = 0, no pointer swell. The same call is the governor's
  // blown-budget state, so composition survives either way.
  function freeze() {
    stopLoop();
    drawFrame();
  }

  motionQuery.addEventListener("change", onMotionChange);
  function onMotionChange(e: MediaQueryListEvent) {
    reduced = e.matches ? 1 : 0;
    if (uReduced) gl.uniform1f(uReduced, reduced);
    if (reduced) freeze();
    else startLoop();
  }

  // Draw one frame immediately rather than waiting on the first rAF. The loop
  // still drives animation, but first paint does not depend on a callback that
  // never fires in a backgrounded or headless tab. Under reduced motion this
  // single frame at t=0 IS the field (D4.9: static, not slow).
  if (!build()) {
    return () => {
      disposed = true;
    };
  }
  resize();
  drawFrame();
  if (!reduced) startLoop();

  // Pause when the tab is hidden. A background shader is the single most
  // expensive thing on the page and it does not need to run unseen.
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) stopLoop();
      else if (!reduced) startLoop();
    },
  );

  // Context loss: without preventDefault the browser refuses to ever fire
  // webglcontextrestored and the canvas is permanently blank (measured:
  // gl.getError() = 37442, restoreContext() refused). The program and uniforms
  // do not survive a restore, so they are rebuilt from the same source.
  const onContextLost = (e: Event) => {
    e.preventDefault();
    stopLoop();
  };
  const onContextRestored = () => {
    if (disposed) return;
    if (build()) {
      resize();
      if (reduced) freeze();
      else startLoop();
    }
  };
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  return () => {
    disposed = true;
    stopLoop();
    ro.disconnect();
    motionQuery.removeEventListener("change", onMotionChange);
    window.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    canvas.removeEventListener("webglcontextrestored", onContextRestored);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
}

// Exported for the probe (see tools/probe.astro). The shader strings are
// otherwise module-private, which makes them impossible to test without
// rendering the whole page. The SDF tier is deliberately NOT re-exported here:
// it lives in ./background-sdf so it can be lazy-loaded, and a static
// re-export would pull it straight back into the main chunk. The probe
// imports that module directly instead.
export const INSTANCED_SHADERS = { vert: VERT_INSTANCED, frag: FRAG_INSTANCED };
export { ELEMENTS };
