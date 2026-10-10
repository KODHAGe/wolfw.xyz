const y=[{rotation:80,width:10,dash:100,freq:100,amp:60,gridDist:0,offset:7,grid:1,total:200,posX:110,posY:-50},{rotation:-10,width:1,dash:100,freq:10,amp:15,gridDist:10,offset:12,grid:10,total:200,posX:-200,posY:100},{rotation:20,width:1,dash:100,freq:2,amp:15,gridDist:10,offset:200,grid:7,total:240,posX:-400,posY:250},{rotation:30,width:2,dash:80,freq:20,amp:60,gridDist:100,offset:12,grid:7,total:200,posX:300,posY:-150},{rotation:-180,width:8,dash:10,freq:120,amp:20,gridDist:0,offset:7,grid:2,total:240,posX:-430,posY:250},{rotation:-130,width:2,dash:10,freq:20,amp:10,gridDist:0,offset:7,grid:10,total:180,posX:550,posY:-250},{rotation:-45,width:1,dash:10,freq:10,amp:20,gridDist:10,offset:1,grid:6,total:200,posX:0,posY:0}],k=`#version 300 es
// Fullscreen triangle. No attributes, no buffers — positions come from the
// vertex index. Cheaper than a quad and avoids the diagonal seam.
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`,q=`#version 300 es
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
// collapsing them into one slot was a bug - the rows of each grid drew on top of
// each other instead of fanning out.
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
}`;function v(o,e,i){const n=o.createShader(e);if(o.shaderSource(n,i),o.compileShader(n),!o.getShaderParameter(n,o.COMPILE_STATUS))throw new Error(o.getShaderInfoLog(n)??"shader compile failed");return n}function A(o){const e=o.getContext("webgl2",{alpha:!0,antialias:!1,premultipliedAlpha:!0,powerPreference:"low-power"});if(!e)return o.dataset.fallback="true",()=>{};let i;try{if(i=e.createProgram(),e.attachShader(i,v(e,e.VERTEX_SHADER,k)),e.attachShader(i,v(e,e.FRAGMENT_SHADER,q)),e.linkProgram(i),!e.getProgramParameter(i,e.LINK_STATUS))throw new Error(e.getProgramInfoLog(i)??"link failed")}catch(t){return console.warn("[background] shader setup failed, falling back",t),o.dataset.fallback="true",()=>{}}e.useProgram(i);const n=window.matchMedia("(prefers-reduced-motion: reduce)");let l=n.matches?1:0;n.addEventListener("change",t=>{l=t.matches?1:0,l&&(u=0)});const g=t=>{const r=e.getUniformLocation(i,t);return r===null&&console.warn(`[background] uniform ${t} not found`),r},s=new Float32Array(56);y.forEach((t,r)=>{const a=r*8;s[a+0]=t.rotation,s[a+1]=t.width,s[a+2]=t.dash,s[a+3]=t.freq,s[a+4]=t.amp,s[a+5]=t.grid,s[a+6]=t.offset,s[a+7]=t.total}),e.uniform1fv(g("u_p[0]"),s);const f=new Float32Array(14);y.forEach((t,r)=>{f[r*2]=t.posX,f[r*2+1]=t.posY}),e.uniform1fv(g("u_pos[0]"),f);const _=getComputedStyle(document.documentElement).getPropertyValue("--c-field").trim(),c=T(_);e.uniform3f(e.getUniformLocation(i,"u_accent"),c[0],c[1],c[2]),e.uniform1f(e.getUniformLocation(i,"u_alpha"),1),e.uniform1f(e.getUniformLocation(i,"u_reduced"),l);const E=e.getUniformLocation(i,"u_resolution"),w=e.getUniformLocation(i,"u_time"),S=e.getUniformLocation(i,"u_pixelRatio");let d=0,u=performance.now(),h=!0;function p(){const t=Math.min(window.devicePixelRatio||1,2),r=Math.floor(o.clientWidth*t),a=Math.floor(o.clientHeight*t);(o.width!==r||o.height!==a)&&(o.width=r,o.height=a,e.viewport(0,0,r,a),e.uniform2f(E,r,a),e.uniform1f(S,t))}function m(t){h&&(p(),e.uniform1f(w,(t-u)/1e3),e.drawArrays(e.TRIANGLES,0,3),d=requestAnimationFrame(m))}p(),e.uniform1f(w,0),e.drawArrays(e.TRIANGLES,0,3),l||(d=requestAnimationFrame(m)),document.addEventListener("visibilitychange",()=>{document.hidden?(h=!1,cancelAnimationFrame(d)):!l&&h===!1&&(h=!0,u=performance.now()-1e3,d=requestAnimationFrame(m))});const b=new ResizeObserver(p);return b.observe(o),()=>{h=!1,cancelAnimationFrame(d),b.disconnect(),e.getExtension("WEBGL_lose_context")?.loseContext()}}function T(o){const e=o.replace("#",""),i=parseInt(e.length===3?e.split("").map(n=>n+n).join(""):e,16);return[(i>>16&255)/255,(i>>8&255)/255,(i&255)/255]}const x=document.getElementById("background");if(x instanceof HTMLCanvasElement){const o=A(x);document.addEventListener("astro:before-swap",o,{once:!0})}
