const v=[{rotation:80,width:10,dash:100,freq:100,amp:60,gridDist:0,offset:7,grid:1,total:200,posX:110,posY:-50},{rotation:-10,width:1,dash:100,freq:10,amp:15,gridDist:10,offset:12,grid:10,total:200,posX:-200,posY:100},{rotation:20,width:1,dash:100,freq:2,amp:15,gridDist:10,offset:200,grid:7,total:240,posX:-400,posY:250},{rotation:30,width:2,dash:80,freq:20,amp:60,gridDist:100,offset:12,grid:7,total:200,posX:300,posY:-150},{rotation:-180,width:8,dash:10,freq:120,amp:20,gridDist:0,offset:7,grid:2,total:240,posX:-550,posY:450},{rotation:-130,width:2,dash:10,freq:20,amp:10,gridDist:0,offset:7,grid:10,total:180,posX:550,posY:-250},{rotation:-45,width:1,dash:10,freq:10,amp:20,gridDist:10,offset:1,grid:6,total:200,posX:0,posY:0}],k=`#version 300 es
// Fullscreen triangle. No attributes, no buffers — positions come from the
// vertex index. Cheaper than a quad and avoids the diagonal seam.
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`,L=`#version 300 es
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
}`;function _(o,t,a){const n=o.createShader(t);if(o.shaderSource(n,a),o.compileShader(n),!o.getShaderParameter(n,o.COMPILE_STATUS))throw new Error(o.getShaderInfoLog(n)??"shader compile failed");return n}function S(o){const t=o.getContext("webgl2",{alpha:!0,antialias:!1,premultipliedAlpha:!0,powerPreference:"low-power"});if(!t)return o.dataset.fallback="true",()=>{};let a;try{if(a=t.createProgram(),t.attachShader(a,_(t,t.VERTEX_SHADER,k)),t.attachShader(a,_(t,t.FRAGMENT_SHADER,L)),t.linkProgram(a),!t.getProgramParameter(a,t.LINK_STATUS))throw new Error(t.getProgramInfoLog(a)??"link failed")}catch(e){return console.warn("[background] shader setup failed, falling back",e),o.dataset.fallback="true",()=>{}}t.useProgram(a);const n=window.matchMedia("(prefers-reduced-motion: reduce)");let l=n.matches?1:0;n.addEventListener("change",e=>{l=e.matches?1:0,l&&(h=0)});const g=e=>{const r=t.getUniformLocation(a,e);return r===null&&console.warn(`[background] uniform ${e} not found`),r},s=new Float32Array(56);v.forEach((e,r)=>{const i=r*8;s[i+0]=e.rotation,s[i+1]=e.width,s[i+2]=e.dash,s[i+3]=e.freq,s[i+4]=e.amp,s[i+5]=e.grid,s[i+6]=e.offset,s[i+7]=e.total}),t.uniform1fv(g("u_p[0]"),s);const c=new Float32Array(14);v.forEach((e,r)=>{c[r*2]=e.posX,c[r*2+1]=e.posY}),t.uniform1fv(g("u_pos[0]"),c);const x=getComputedStyle(document.documentElement).getPropertyValue("--c-field").trim(),u=A(x);t.uniform3f(t.getUniformLocation(a,"u_accent"),u[0],u[1],u[2]),t.uniform1f(t.getUniformLocation(a,"u_alpha"),.85),t.uniform1f(t.getUniformLocation(a,"u_reduced"),l);const q=t.getUniformLocation(a,"u_resolution"),w=t.getUniformLocation(a,"u_time"),E=t.getUniformLocation(a,"u_pixelRatio");let f=0,h=performance.now(),d=!0;function m(){const e=Math.min(window.devicePixelRatio||1,2),r=Math.floor(o.clientWidth*e),i=Math.floor(o.clientHeight*e);(o.width!==r||o.height!==i)&&(o.width=r,o.height=i,t.viewport(0,0,r,i),t.uniform2f(q,r,i),t.uniform1f(E,e))}function p(e){d&&(m(),t.uniform1f(w,(e-h)/1e3),t.drawArrays(t.TRIANGLES,0,3),f=requestAnimationFrame(p))}m(),t.uniform1f(w,0),t.drawArrays(t.TRIANGLES,0,3),l||(f=requestAnimationFrame(p)),document.addEventListener("visibilitychange",()=>{document.hidden?(d=!1,cancelAnimationFrame(f)):!l&&d===!1&&(d=!0,h=performance.now()-1e3,f=requestAnimationFrame(p))});const b=new ResizeObserver(m);return b.observe(o),()=>{d=!1,cancelAnimationFrame(f),b.disconnect(),t.getExtension("WEBGL_lose_context")?.loseContext()}}function A(o){const t=o.replace("#",""),a=parseInt(t.length===3?t.split("").map(n=>n+n).join(""):t,16);return[(a>>16&255)/255,(a>>8&255)/255,(a&255)/255]}const y=document.getElementById("background");if(y instanceof HTMLCanvasElement){const o=S(y);document.addEventListener("astro:before-swap",o,{once:!0})}
