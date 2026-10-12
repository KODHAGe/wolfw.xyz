/*
 * Tier B — the SDF fullscreen quad.
 *
 * This is the FALLBACK renderer, kept deliberately (visual-effects.md §2.1:
 * "SDF, kept deliberately as tier B"). It is the program the site shipped
 * until the instanced rewrite, it compiles and renders today, and it is what
 * the field falls back to if the instanced program fails on some device — then
 * to the CSS radial gradient (tier C). None of the three rungs is a black box.
 *
 * It lives in its own module so `background.ts` can load it DYNAMICALLY. When
 * both shader pairs sat in one module, this file's ~5 KB of GLSL shipped to
 * every visitor to fix a failure mode that has never occurred — which is what
 * pushed the page past its 12 KB JS budget. Now the fallback costs zero bytes
 * on the happy path and is fetched only if tier A fails to compile or link.
 *
 * The field maths is unchanged from the version that shipped; see
 * background.ts for what it costs (O(pixels × strokes), which is why it is no
 * longer the shipping path).
 */

export const SDF_SHADERS = {
  vert: `#version 300 es
// Fullscreen triangle. No attributes, no buffers — positions come from the
// vertex index. Cheaper than a quad and avoids the diagonal seam.
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`,

  frag: `#version 300 es
precision highp float;

// PIXEL SPACE, deliberately. The legacy parameters (totalWidth 180-240,
// frequency 2-120) are PIXEL values — backgroundElement.js:49 sampled x from
// 0..totalWidth and used frequency in the same units. Feeding those into
// normalised coordinates made the bounds check never fire and the curves run
// unbounded, which is what produced the giant slabs.

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
// collapsing them into one slot was a bug - the rows of each grid drew on top of
// each other instead of fanning out.
const int STRIDE = 9;
uniform float u_p[63];   // N * STRIDE

// position jitter, in px relative to viewport centre (x2 = 14)
uniform float u_pos[14];

// Device-pixel ratio, as a FUNCTION. strokeAt() needs it for the antialiasing
// feather and main() needs it to convert to CSS pixels, so it cannot be a local.
// It also cannot be a global initialiser: GLSL requires global initialisers to be
// constant expressions, and a uniform is not one. Assigning a uniform to a global
// is a compile error, which fails silently in production — the build passes, the
// page loads, the canvas is simply blank. Hence a function.
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
  // canvas opaque and read as "the shader draws nothing".
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
    // with no scaling and no clamping - element 6 sits exactly on the centre.
    // Negated on y: the legacy frame is top-left origin with y increasing
    // downward, while gl_FragCoord.y increases upward. Without this the entire
    // field is mirrored vertically.
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

      // stroke-dasharray, phased along the path so it is measured from the
      // start of the curve rather than from the element origin.
      float period = max(dash, 4.0);
      float m = mod(q.x - offs * gi + t * 20.0 * (hash(float(i) + 3.0) - 0.5), period);
      line *= smoothstep(0.0, 1.0, period * 0.45 - m + period * 0.45);

      acc = max(acc, line);
    }
  }

  // Full opacity, pure ink — the legacy drew no opacity on the paths
  // (backgroundElement.js:38-43 sets only strokeDasharray, strokeWidth and
  // strokeLinecap), so the field drew at 100% black.
  outColor = vec4(u_accent * acc, clamp(acc, 0.0, 1.0) * u_alpha);
}`,
};