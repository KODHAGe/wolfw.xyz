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
 * D4.11 — one shared WebGL2 context for the whole page. Button effects
 * composite into this same context rather than opening their own.
 *
 * D4.9 — reduced motion renders a single static frame, tracked in both
 * directions: the media query is re-read on change, the uniform is re-uploaded,
 * and the frame loop is stopped and started symmetrically.
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
const POSITION_NOTE = true;
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

const VERT = `#version 300 es
// Fullscreen triangle. No attributes, no buffers — positions come from the
// vertex index. Cheaper than a quad and avoids the diagonal seam.
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

// The legacy field was: for x in 0..totalWidth step 1, y = top + sin(x/freq * 2PI) * (amp/2),
// stroked with a dash pattern, translated and rotated into place.
// Reproduced as an SDF so it can be antialiased and dashed per-pixel rather
// than tessellated into thousands of DOM path points.
const FRAG = `#version 300 es
precision highp float;

// D4.4. PIXEL SPACE, deliberately.
//
// The first two passes failed because legacy parameters (totalWidth 180-240,
// frequency 2-120) are PIXEL values — backgroundElement.js:49 sampled
// x from 0..totalWidth and used frequency in the same units. Feeding those
// into normalised coordinates made the bounds check never fire and the curves
// run unbounded, which is what produced the giant slabs.
//
// Working in pixels is also more faithful: it makes strokeWidth mean exactly
// what strokeWidth meant in the SVG.

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_pixelRatio;
uniform vec3  u_accent;
uniform float u_alpha;
uniform float u_reduced;    // float, not int — compared against 0.5

out vec4 outColor;

const int N = 7;

// Nine fields per element, in elementProps[] order (background.js:37-119).
// NINE, not eight: gridDistance and gridSize are separate properties and
// collapsing them into one slot was a bug - the rows of each grid drew on top
// of each other instead of fanning out.
//
//   rotation  width  dasharray  frequency  amplitude
//   gridDistance  offset  gridSize  totalWidth
const int STRIDE = 9;
uniform float u_p[63];   // N * STRIDE

// position jitter, in px relative to viewport centre (x2 = 14)
uniform float u_pos[14];

// Device-pixel ratio, as a FUNCTION. strokeAt() needs it for the antialiasing
// feather and main() needs it to convert to CSS pixels, so it cannot be a local.
// It also cannot be a global initialiser: GLSL requires global initialisers to be
// constant expressions, and a uniform is not one. Assigning a uniform to a global
// is a compile error ("global variable initializers must be constant
// expressions"), which fails silently in production — the build passes, the page
// loads, the canvas is simply blank. Hence a function.
float dpr() { return max(u_pixelRatio, 1.0); }

// Small-integer hash. The large-multiple sin() trick loses precision badly at
// the magnitudes this loop reaches, which produced visible banding.
float hash(float n) { return fract(n * 0.1031 + 0.1031); }

// One sine stroke, in pixels.
//
// Transcribed from createPath() (backgroundElement.js:47):
//   for (x = 0; x <= totalWidth; x++) {
//     angle = (x / frequency) * PI * 2
//     y     = top + sin(angle) * (amplitude / 2)
//     path.push((x === 0 ? 'M' : 'L') + (x + offset) + ',' + y)
//   }
//
// and its call site (backgroundElement.js:54):
//   createPath(frequency, amplitude, gridDistance * i, offset * i, totalWidth)
//
// So for grid row i the curve is centred on top and shifted right by shift.
// top is what fans the rows apart; without it every row overdraws the last.
float strokeAt(vec2 q, float freq, float amp, float top, float shift,
               float total, float halfWidth) {
  // Undo the horizontal shift BEFORE bounds-checking: the legacy loop samples x
  // from 0..totalWidth and only adds offset when it emits the point.
  float x = q.x - shift;

  // Bounds. The legacy loop stopped at totalWidth (backgroundElement.js:49).
  //
  // CRITICAL: this returns 0, NOT a large sentinel. The caller uses the return
  // value directly as line intensity, so returning 1e4 here made every
  // out-of-range pixel contribute 1e4 to the max() - which saturated the whole
  // canvas opaque and read as "the shader draws nothing" (or as a black sheet,
  // once it sat on the white one).
  if (x < 0.0 || x > total) return 0.0;

  float angle = (x / freq) * 6.28318530718;
  float y = top + sin(angle) * (amp * 0.5);
  float d = abs(q.y - y);

  // 1px antialiasing. halfWidth is HALF the legacy strokeWidth, so a
  // strokeWidth of 1 stays a hairline - exactly as it is in the SVG.
  return 1.0 - smoothstep(halfWidth, halfWidth + 1.0 / dpr(), d);
}

void main() {
  // CSS pixels, not device pixels. The legacy built every number in CSS px -
  // strokeWidth, frequency, amplitude, gridDistance, totalWidth, the position
  // offsets - so gl_FragCoord must be divided by the pixel ratio or the whole
  // field renders at half scale on any HiDPI screen.
  vec2 p = gl_FragCoord.xy / dpr();
  vec2 res = u_resolution / dpr();
  vec2 center = res * 0.5;

  float acc = 0.0;
  float t = u_reduced > 0.5 ? 0.0 : u_time;

  for (int i = 0; i < N; i++) {
    // Element i's nine parameters start at i * STRIDE.
    //
    // This was u_p[i + int(b + k)], which for i=1 read index 9 - one field into
    // element 1 - so from the second element onward every parameter was shifted
    // and the field was drawn from the wrong numbers entirely.
    int b = i * STRIDE;

    float rotation = u_p[b + 0];
    float width    = u_p[b + 1];
    float dash     = u_p[b + 2];
    float freq     = max(u_p[b + 3], 1.0);
    float amp      = u_p[b + 4];
    float gridDist = u_p[b + 5];
    float offs     = u_p[b + 6];
    float gridSize = u_p[b + 7];
    float total    = u_p[b + 8];

    // Slow drift. The legacy rotated by a random amount once per load; this
    // breathes gently instead (background.js:38 rotation came from
    // getRandomIntAround).
    float spin = radians(rotation) + t * 0.05 * (hash(float(i) + 1.7) - 0.5);

    // Position, in RAW PIXELS from viewport centre.
    //
    // background.js:12-18 puts each element at
    //   [innerWidth/2 +/- getRandomIntAround(baseX),
    //    innerHeight/2 +/- getRandomIntAround(baseY)]
    // with no scaling and no clamping - element 6 sits exactly on the centre. An
    // earlier version scaled these by a viewport fraction and clamped to the
    // canvas, which pulled the field inward and made it lopsided. The legacy
    // numbers are already in pixels, so they are used as written.
    // Negated on y: the legacy frame is top-left origin with y increasing
    // downward (background.js:12-18 builds [innerWidth/2 + dx, innerHeight/2 + dy]
    // straight into an SVG transform), while gl_FragCoord.y increases upward.
    // Without this the entire field is mirrored vertically.
    vec2 pos = center + vec2(u_pos[i * 2], -u_pos[i * 2 + 1]);

    // Into the curve's local frame, rotated about its own origin.
    float c = cos(-spin), s = sin(-spin);
    vec2 q = p - pos;
    q = vec2(q.x * c - q.y * s, q.x * s + q.y * c);

    int n = int(clamp(gridSize, 1.0, 10.0));

    for (int g = 0; g < 10; g++) {
      if (g >= n) break;
      float gi = float(g);

      float line = strokeAt(
        q,
        freq,
        amp,
        gridDist * gi,     // top   - the vertical fan
        offs * gi,         // shift - the horizontal stair
        total,
        max(width * 0.5, 0.5)
      );

      // stroke-dasharray, phased along the path so it is measured from the start
      // of the curve rather than from the element origin.
      float period = max(dash, 4.0);
      float m = mod(q.x - offs * gi + t * 20.0 * (hash(float(i) + 3.0) - 0.5), period);
      line *= smoothstep(0.0, 1.0, period * 0.45 - m + period * 0.45);

      acc = max(acc, line);
    }
  }

  // Full opacity, pure ink.
  //
  // There is deliberately NO radial falloff and NO text-protection zone here.
  // Both existed in an earlier pass as readability "improvements" and both are
  // inventions: the legacy drew the field at full opacity straight over the page
  // heading and the intro copy, which is why the live site shows scribbles
  // crossing "wolfw.xyz". A rebuild that quietly protects the text is not the
  // same site - improvements belong in desired.md, not smuggled into recovered
  // behaviour.
  outColor = vec4(u_accent * acc, clamp(acc, 0.0, 1.0) * u_alpha);
}`;

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

  // Everything the GL side needs, rebuilt atomically on mount and on context
  // restoration (a lost context keeps its JS objects but drops its program and
  // every uniform; nothing survives a restore except the context itself).
  let program: WebGLProgram | null = null;
  let uRes: WebGLUniformLocation | null = null;
  let uTime: WebGLUniformLocation | null = null;
  let uDpr: WebGLUniformLocation | null = null;
  let uReduced: WebGLUniformLocation | null = null;

  function build(): boolean {
    try {
      program = gl.createProgram()!;
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) ?? "link failed");
      }
    } catch (err) {
      console.warn("[background] shader setup failed, falling back", err);
      canvas.dataset.fallback = "true";
      program = null;
      return false;
    }
    gl.useProgram(program);
    canvas.dataset.fallback = "false";

    // Upload parameters. STRIDE is 9, matching the shader's elementProps order:
    // rotation, width, dasharray, frequency, amplitude, gridDistance, offset,
    // gridSize, totalWidth. The array is N * STRIDE = 63 floats. The old upload
    // wrote stride 8 into 56 floats and never wrote gridDist or total, so
    // element 0 failed its bounds check (invisible) and elements 1-6 read
    // another element's parameters. visual-effects.md §0.
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
    gl.uniform1fv(loc(program, "u_p[0]"), params);

    // Position offsets. Legacy randomised these around viewport centre on every
    // load (background.js:12-18); the shader scales by viewport height so they
    // land proportionally at any site.
    const positions = new Float32Array(14);
    ELEMENTS.forEach((e, i) => {
      positions[i * 2] = e.posX;
      positions[i * 2 + 1] = e.posY;
    });
    gl.uniform1fv(loc(program, "u_pos[0]"), positions);

    // Legacy drew the field in BLACK (backgroundElement.js:82, defaultProps color
    // 'black'), 1-10px, full opacity. A pale accent at reduced alpha covers under
    // 1% of pixels and disappears against a near-white page, which is what the
    // first few passes produced. Ink for the field, accent reserved for UI.
    // --c-field is a JS interface, not just a CSS token: the GPU layer reads it
    // through getComputedStyle (design/frontend-architecture.md §2.4).
    const fieldColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--c-field")
      .trim();
    const rgb = hexToRgb(fieldColor);
    gl.uniform3f(loc(program, "u_accent"), rgb[0], rgb[1], rgb[2]);
    // Full opacity. The legacy set no opacity on the paths (backgroundElement.js:38-43
    // sets only strokeDasharray, strokeWidth and strokeLinecap), so the field drew at
    // 100% black. An earlier pass used 0.5 to keep it "from fighting the text"; that was
    // an invention, and it is what made the field look like a grey smudge instead of ink.
    gl.uniform1f(loc(program, "u_alpha"), 1.0);

    uRes = loc(program, "u_resolution");
    uTime = loc(program, "u_time");
    uDpr = loc(program, "u_pixelRatio");
    uReduced = loc(program, "u_reduced");
    gl.uniform1f(uReduced, reduced);
    return true;
  }

  // D4.9 — the preference, tracked in BOTH directions. The former code read it
  // once and re-read the change listener's variable without ever re-uploading
  // the u_reduced uniform, so the shader kept animating; and it reset `start` to
  // 0, which made the field visibly jump. Both directions now:
  //   ON  → stop the loop and freeze the CURRENT frame (no rewind, no jump)
  //   OFF → restart the loop from the frozen time (no jump)
  // At load, `elapsed` is still 0, so the reduced-motion static frame is the
  // same t=0 frame it has always been — a full field at sweep start, not a
  // half-drawn one.
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = motionQuery.matches ? 1 : 0;

  let raf = 0;
  let start = performance.now();
  let elapsed = 0; // seconds of field motion actually drawn
  let running = false;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap: 3x is wasteful
    const w = Math.floor(canvas.clientWidth * dpr);
    const h = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      if (uRes) gl.uniform2f(uRes, w, h);
      if (uDpr) gl.uniform1f(uDpr, dpr);
      // Setting canvas.width clears the buffer, so a stopped (reduced-motion)
      // frame would vanish on resize unless it is redrawn here.
      if (!running) drawFrame(elapsed);
    }
  }

  function drawFrame(seconds: number) {
    if (!program) return;
    if (uTime) gl.uniform1f(uTime, seconds);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function frame(now: number) {
    if (!running) return;
    resize();
    elapsed = (now - start) / 1000;
    drawFrame(elapsed);
    raf = requestAnimationFrame(frame);
  }

  function startLoop() {
    if (running || disposed) return;
    running = true;
    start = performance.now() - elapsed * 1000;
    raf = requestAnimationFrame(frame);
  }

  function stopLoop() {
    running = false;
    cancelAnimationFrame(raf);
    raf = 0;
  }

  // Freeze at the CURRENT frame, not at t=0. The old `start = 0` reset rewound
  // the field into a visible jump the instant the preference changed; the frame
  // the visitor is already looking at is the calmer static state.
  function freeze() {
    stopLoop();
    drawFrame(elapsed);
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
  drawFrame(elapsed);
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
    canvas.removeEventListener("webglcontextlost", onContextLost);
    canvas.removeEventListener("webglcontextrestored", onContextRestored);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
}

// Exported for the probe (see tools/probe.astro). The shader strings are
// otherwise module-private, which makes them impossible to test without
// rendering the whole page.
export const SHADERS = { vert: VERT, frag: FRAG };
export { ELEMENTS };
