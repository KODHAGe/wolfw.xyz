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
 * D4.9 — reduced motion renders a single static frame. Not a slower animation,
 * and not a hidden one.
 */

// ---------------------------------------------------------------------------
// Parameters. Straight from recovered.md#R6.1.
//
// The legacy table, for comparison:
//   rotation  width  dasharray  frequency  amplitude  gridDistance  offset
//   gridSize  totalWidth
// Values are the CENTRES of the legacy random ranges. Legacy randomised each
// within [0.5v, 1.5v] per load via getRandomIntAround; here we keep the same
// range but make it explicit and, optionally, seeded.
// ---------------------------------------------------------------------------

const ELEMENTS = [
  // rotation  width dasharray frequency amplitude gridDist offset gridSize totalWidth
  { rotation: 80,   width: 10, dash: 100, freq: 100, amp: 60, gridDist: 0,   offset: 7,   grid: 1,  total: 200, posX: 110, posY: -50 },
  { rotation: -10,  width: 1,  dash: 100, freq: 10,  amp: 15, gridDist: 10,  offset: 12,  grid: 10, total: 200, posX: -200, posY: 100 },
  { rotation: 20,   width: 1,  dash: 100, freq: 2,   amp: 15, gridDist: 10,  offset: 200, grid: 7,  total: 240, posX: -400, posY: 250 },
  { rotation: 30,   width: 2,  dash: 80,  freq: 20,  amp: 60, gridDist: 100, offset: 12,  grid: 7,  total: 200, posX: 300,  posY: -150 },
  { rotation: -180, width: 8,  dash: 10,  freq: 120, amp: 20, gridDist: 0,   offset: 7,   grid: 2,  total: 240, posX: -550, posY: 450 },
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

// rotation, width, dash, freq, amp, grid, offset, totalWidth  (x8 = 56)
uniform float u_p[56];

// position jitter, in px relative to viewport centre (x2 = 14)
uniform float u_pos[14];

// Small-integer hash. The large-multiple sin() trick loses precision badly at
// the magnitudes this loop reaches, which produced visible banding.
float hash(float n) { return fract(n * 0.1031 + 0.1031); }

// Distance to one sine stroke, in pixels.
float strokeAt(vec2 q, float freq, float amp, float top, float shift,
               float total, float halfWidth) {
  // Bounds. The legacy stopped at totalWidth (backgroundElement.js:49).
  if (q.x < 0.0 || q.x > total) return 1e4;

  float angle = (q.x / freq) * 6.28318530718;
  float y = top + sin(angle) * (amp * 0.5);
  float d = abs(q.y - y);

  // 1px antialiasing.
  return 1.0 - smoothstep(halfWidth, halfWidth + 1.0, d);
}

void main() {
  vec2 p = gl_FragCoord.xy;              // pixels, origin bottom-left
  vec2 res = u_resolution;
  vec2 center = res * 0.5;
  vec2 uv = p / res;

  float acc = 0.0;
  float t = u_reduced > 0.5 ? 0.0 : u_time;

  for (int i = 0; i < N; i++) {
    float b = float(i) * 8.0;

    float rotation = radians(u_p[i + int(b + 0.0)]);
    float width    = u_p[i + int(b + 1.0)];
    float dash     = u_p[i + int(b + 2.0)];
    float freq     = max(u_p[i + int(b + 3.0)], 1.0);
    float amp      = u_p[i + int(b + 4.0)];
    float grid     = u_p[i + int(b + 5.0)];
    float offs     = u_p[i + int(b + 6.0)];
    float total    = u_p[i + int(b + 7.0)];

    // Slow drift, in pixels. Legacy rotated by a random amount per load; this
    // breathes gently instead (background.js:38 rotation came from
    // getRandomIntAround).
    float spin = rotation + t * 0.05 * (hash(float(i) + 1.7) - 0.5);

    // Position: legacy randomised around viewport centre per load
    // (background.js:12-18). Scaled to the viewport so it lands proportionally.
    vec2 pos = center + u_pos[i * 2] * (res.y / 1400.0);
    pos.y += u_pos[i * 2 + 1] * (res.y / 1400.0);

    // Into the curve's local frame, about its own origin.
    float c = cos(-spin), s = sin(-spin);
    vec2 q = p - pos;
    q = vec2(q.x * c - q.y * s, q.x * s + q.y * c);

    int n = int(clamp(grid, 1.0, 10.0));

    for (int g = 0; g < 10; g++) {
      if (g >= n) break;
      float gi = float(g);

      // Legacy: createPath(freq, amp, gridDistance*i, offset*i, totalWidth)
      // so gridDistance offsets vertically and offset shifts horizontally.
      vec2 gg = q - vec2(offs * gi, 0.0);

      float line = strokeAt(gg, freq, amp, 0.0, 0.0, total * 2.2, max(width * 0.75, 1.2));

      // Dash pattern along the curve, stroke-dasharray semantics.
      float period = max(dash, 4.0);
      float m = mod(gg.x + t * 20.0 * (hash(float(i) + 3.0) - 0.5), period);
      line *= smoothstep(0.0, 1.0, period * 0.45 - m + period * 0.45);

      // Frame the content. The legacy had no falloff at all; this is new, and
      // it is what makes the field readable behind a CV rather than fighting it.
      float edge = 1.0 - smoothstep(0.55, 1.45, length(uv - 0.5) * 1.7);
      // Protect the reading column. Softened from 0.72 — the first pass
      // suppressed so much of the field that only the corners survived.
      float textZone = smoothstep(0.0, 0.40, uv.x) * (1.0 - smoothstep(0.62, 0.98, uv.y));
      line *= edge * (1.0 - 0.35 * textZone);

      acc = max(acc, line);
    }
  }

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

  let program: WebGLProgram;
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
    return () => {};
  }

  gl.useProgram(program);

  // D4.9 — read the preference once, and react if it changes mid-session.
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = motionQuery.matches ? 1 : 0;
  motionQuery.addEventListener("change", (e) => {
    reduced = e.matches ? 1 : 0;
    if (reduced) start = 0; // reset so the static frame is deterministic
  });

  /*
   * Array uniforms MUST be looked up as "name[0]". Passing "u_p" returns null on
   * some implementations, and a null location makes uniform1fv a silent no-op —
   * which left every parameter zero, so the bounds check rejected every pixel
   * and the field drew nothing. Guarding null keeps that loud, not silent.
   */
  const loc = (name: string) => {
    const l = gl.getUniformLocation(program, name);
    if (l === null) console.warn(`[background] uniform ${name} not found`);
    return l;
  };

  // Upload parameters. Indices 0..6 are the ones the fragment shader reads;
  // 7 is grid size, kept so the table round-trips intact.
  const params = new Float32Array(56);
  ELEMENTS.forEach((e, i) => {
    const b = i * 8;
    params[b + 0] = e.rotation;
    params[b + 1] = e.width;
    params[b + 2] = e.dash;
    params[b + 3] = e.freq;
    params[b + 4] = e.amp;
    params[b + 5] = e.grid;
    params[b + 6] = e.offset;
    params[b + 7] = e.total;
  });
  gl.uniform1fv(loc("u_p[0]"), params);

  // Position offsets. Legacy randomised these around viewport centre on every
  // load (background.js:12-18); the shader scales by viewport height so they
  // land proportionally at any size.
  const positions = new Float32Array(14);
  ELEMENTS.forEach((e, i) => {
    positions[i * 2] = e.posX;
    positions[i * 2 + 1] = e.posY;
  });
  gl.uniform1fv(loc("u_pos[0]"), positions);

  // Legacy drew the field in BLACK (backgroundElement.js:82, defaultProps color
  // 'black'), 1-10px, full opacity. A pale accent at reduced alpha covers under
  // 1% of pixels and disappears against a near-white page, which is what the
  // first few passes produced. Ink for the field, accent reserved for UI.
  const fieldColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--c-field")
    .trim();
  const rgb = hexToRgb(fieldColor);
  gl.uniform3f(gl.getUniformLocation(program, "u_accent"), rgb[0], rgb[1], rgb[2]);
  gl.uniform1f(gl.getUniformLocation(program, "u_alpha"), 0.85);
  gl.uniform1f(gl.getUniformLocation(program, "u_reduced"), reduced);

  const uRes = gl.getUniformLocation(program, "u_resolution");
  const uTime = gl.getUniformLocation(program, "u_time");
  const uDpr = gl.getUniformLocation(program, "u_pixelRatio");

  let raf = 0;
  let start = performance.now();
  let running = true;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap: 3x is wasteful
    const w = Math.floor(canvas.clientWidth * dpr);
    const h = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uDpr, dpr);
    }
  }

  function frame(now: number) {
    if (!running) return;
    resize();
    gl.uniform1f(uTime, (now - start) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(frame);
  }

  // Draw one frame immediately rather than waiting on the first rAF. The loop
  // still drives animation, but first paint does not depend on a callback that
  // never fires in a backgrounded or headless tab.
  resize();
  gl.uniform1f(uTime, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  // D4.9 — reduced motion stops after that single static frame.
  if (!reduced) {
    raf = requestAnimationFrame(frame);
  }

  // Pause when the tab is hidden. A background shader is the single most
  // expensive thing on the page and it does not need to run unseen.
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!reduced && running === false) {
        running = true;
        start = performance.now() - 1000; // avoid a jump after a long pause
        raf = requestAnimationFrame(frame);
      }
    },
  );

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    ro.disconnect();
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const v = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

// Exported for the probe (see src/pages/probe.astro and .opencode/agent/gpu-debugger.md).
// The shader strings are otherwise module-private, which makes them impossible
// to test without rendering the whole page.
export const SHADERS = { vert: VERT, frag: FRAG };
export { ELEMENTS };
