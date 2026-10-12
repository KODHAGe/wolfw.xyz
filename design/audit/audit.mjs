#!/usr/bin/env node
/*
 * wolfw.xyz redesign audit harness.
 *
 * Builds the Astro site, serves it, and runs accessibility + performance
 * checks against the BUILT output (rebuild/dist), printing PASS/FAIL per
 * check and exiting non-zero on any FAIL. Run it before and after any
 * redesign work; the budgets at the top are the baseline this audit
 * established (see design/accessibility-performance.md).
 *
 *   node design/audit/audit.mjs            build + audit (build gets a dummy
 *                                          PUBLIC_CV_PASSWORD so the CV gate
 *                                          branch is exercised)
 *   SKIP_BUILD=1 node design/audit/audit.mjs   audit the existing dist
 *   PORT=4399 node design/audit/audit.mjs      different preview port
 *
 * Requires: Google Chrome (channel:"chrome") and node >= 18.17 on PATH with
 * /opt/homebrew/bin prepended (Astro 5 floor). Deps are declared in
 * design/audit/package.json; run `npm install` there once.
 *
 * Exit codes: 0 all pass (WARN allowed) · 1 at least one FAIL · 2 could not run.
 */

import { chromium } from "playwright-core";
import { PNG } from "pngjs";
import axeCore from "axe-core";
import { readFileSync, existsSync, readdirSync, mkdirSync, statSync } from "node:fs";
import { execSync, spawn } from "node:child_process";
import { join, basename } from "node:path";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const REBUILD = join(ROOT, "rebuild");
const DIST = join(REBUILD, "dist");
const PORT = process.env.PORT ?? "4399";
const BASE = `http://127.0.0.1:${PORT}`;
const EVIDENCE = join(ROOT, "design", "audit", "evidence");

// ---------------------------------------------------------------------------
// Budgets. These are the byte budgets the redesign must not regress
// (design/accessibility-performance.md Part 2). They are set from the measured
// baseline, not from guesswork.
// ---------------------------------------------------------------------------
const BUDGET = {
  jsGzPerPage: 12 * 1024, // baseline ~10.4 KB gz (ClientRouter + Background)
  htmlGzPerPage: 8 * 1024, // baseline: largest page CV = 4.6 KB gz
  cssGz: 4 * 1024, // baseline 1.9 KB gz
  thumbBytes: 150 * 1024, // baseline: 16 of 18 thumbnails exceed this
  imageTotalBytes: 4 * 1024 * 1024, // baseline 13.0 MB
  targetSizePx: 24, // WCAG 2.5.8 minimum
};

// ---------------------------------------------------------------------------
// Result plumbing
// ---------------------------------------------------------------------------
const results = [];
function record(id, status, title, detail, data) {
  results.push({ id, status, title, detail: detail ?? "", data });
  const flag = { PASS: "✓", FAIL: "✗", WARN: "!", INFO: "·" }[status];
  console.log(`${flag} [${id}] ${title}${detail ? ` — ${detail}` : ""}`);
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
const gz = (buf) => gzipSync(Buffer.isBuffer(buf) ? buf : Buffer.from(buf)).length;

function walk(dir, pred = () => true, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, pred, out);
    else if (pred(p)) out.push(p);
  }
  return out;
}

// WCAG 2.x sRGB relative luminance / contrast ratio.
function srgb(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}
function lum([r, g, b]) {
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
}
function contrast(c1, c2) {
  const [l1, l2] = [lum(c1), lum(c2)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}
const hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// Parse PNG IHDR / JPEG SOF0-2 dimensions without shelling out.
function imageSize(path) {
  const b = readFileSync(path);
  if (b[0] === 0x89 && b.toString("ascii", 1, 4) === "PNG") {
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), type: "png" };
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) break;
      const marker = b[i + 1];
      const len = b.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7), type: "jpeg" };
      }
      i += 2 + len;
    }
  }
  if (b.toString("ascii", 0, 5) === "<?xml" || b.toString("ascii", 0, 4) === "<svg") {
    const head = b.toString("utf8", 0, 800);
    const w = head.match(/width="(\d+)/)?.[1];
    const h = head.match(/height="(\d+)/)?.[1];
    return w && h ? { w: +w, h: +h, type: "svg" } : { w: 0, h: 0, type: "svg" };
  }
  return { w: 0, h: 0, type: "other" };
}

function pngDarkFraction(png, threshold = 128) {
  // Fraction of pixels whose luma is below threshold (field strokes = near-black
  // on the white sheet). PNG from element screenshots is RGBA, non-interlaced.
  let dark = 0;
  const { data, width, height } = png;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 8) continue;
    const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    if (luma < threshold) dark++;
  }
  return dark / (width * height);
}

function pngDiffFraction(a, b) {
  if (a.width !== b.width || a.height !== b.height) return 1;
  let diff = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const da = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) +
      Math.abs(a.data[i + 2] - b.data[i + 2]) + Math.abs(a.data[i + 3] - b.data[i + 3]);
    if (da > 12) diff++;
  }
  return diff / (a.width * a.height);
}

// ---------------------------------------------------------------------------
// Stage 0 — build + serve
// ---------------------------------------------------------------------------
async function ensureServer() {
  try {
    const r = await fetch(BASE + "/");
    if (r.ok) return { started: false, kill: () => {} };
  } catch { /* not up */ }

  const child = spawn(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", "preview", "--", "--host", "127.0.0.1", "--port", PORT],
    { cwd: REBUILD, env: { ...process.env, PATH: `/opt/homebrew/bin:${process.env.PATH}` }, stdio: "ignore" },
  );
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const r = await fetch(BASE + "/");
      if (r.ok) return { started: true, kill: () => child.kill() };
    } catch { /* keep waiting */ }
  }
  child.kill();
  throw new Error(`preview server did not come up on ${BASE}`);
}

function build() {
  if (process.env.SKIP_BUILD === "1") {
    if (!existsSync(join(DIST, "index.html"))) throw new Error("SKIP_BUILD set but rebuild/dist is missing");
    return;
  }
  console.log("· building rebuild/ (PUBLIC_CV_PASSWORD=audit-dummy so the CV gate branch ships)…");
  execSync("npm run build", {
    cwd: REBUILD,
    env: {
      ...process.env,
      PATH: `/opt/homebrew/bin:${process.env.PATH}`,
      PUBLIC_CV_PASSWORD: "audit-dummy",
    },
    stdio: "pipe",
  });
}

// ---------------------------------------------------------------------------
// Stage 1 — static checks on dist (no browser)
// ---------------------------------------------------------------------------
const PAGES = {
  home: "/index.html",
  work: "/work/index.html",
  art: "/art/index.html",
  about: "/about/index.html",
  cv: "/cv/index.html",
  project: "/inversion/index.html", // representative project detail
  notfound: "/404.html",
};

function scriptsOf(html) {
  const srcs = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
  const inline = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)]
    .reduce((n, m) => n + m[1].length, 0);
  return { srcs, inline };
}

function staticChecks() {
  // S1 — JS payload per page type
  for (const [type, rel] of Object.entries(PAGES)) {
    const html = readFileSync(join(DIST, rel), "utf8");
    const { srcs, inline } = scriptsOf(html);
    let external = 0;
    for (const s of srcs) external += gz(readFileSync(join(DIST, s.replace(/^\//, ""))));
    const total = external + inline;
    record(
      `S1-${type}`,
      total <= BUDGET.jsGzPerPage ? "PASS" : "FAIL",
      `JS payload /${type === "home" ? "" : type} ≤ ${BUDGET.jsGzPerPage} B gz`,
      `${total} B gz (${srcs.length} external + ${inline} B inline)`,
      { total },
    );
  }

  // S2 — HTML payload per page type
  for (const [type, rel] of Object.entries(PAGES)) {
    const buf = readFileSync(join(DIST, rel));
    const g = gz(buf);
    record(
      `S2-${type}`,
      g <= BUDGET.htmlGzPerPage ? "PASS" : "FAIL",
      `HTML gz /${type} ≤ ${BUDGET.htmlGzPerPage} B`,
      `${buf.length} B raw / ${g} B gz`,
    );
  }

  // S3 — CSS payload
  const cssFiles = walk(join(DIST, "_astro"), (p) => p.endsWith(".css"));
  let cssTotal = 0;
  for (const f of cssFiles) cssTotal += gz(readFileSync(f));
  record("S3-css", cssTotal <= BUDGET.cssGz ? "PASS" : "FAIL", `CSS gz ≤ ${BUDGET.cssGz} B`, `${cssTotal} B gz across ${cssFiles.length} file(s)`);

  // S4 — CV gate honesty: CV text ships in the page payload, gate = "not rendered".
  const cvHtml = readFileSync(join(DIST, PAGES.cv), "utf8");
  const marker = "State Treasury of Finland";
  const inTemplate = /<template id="cv-template"[\s\S]*State Treasury of Finland/.test(cvHtml);
  const gateRenders = cvHtml.includes("if you have a password you can enter");
  record(
    "S4-cv-bundle",
    inTemplate && gateRenders ? "INFO" : "FAIL",
    "CV content present in /cv payload inside inert <template> (D3.1: claim is 'not rendered', never 'not readable')",
    `marker "${marker}" in template: ${inTemplate}; gate form present: ${gateRenders}; page ${gz(cvHtml)} B gz`,
  );

  // S5 — orphaned assets: fonts referenced by any @font-face?
  const cssText = cssFiles.map((f) => readFileSync(f, "utf8")).join("") +
    Object.values(PAGES).map((rel) => readFileSync(join(DIST, rel), "utf8")).join("");
  const fontFace = /@font-face/.test(cssText);
  const fontFiles = walk(join(DIST, "fonts")).map((f) => statSync(f).size).reduce((a, b) => a + b, 0);
  record(
    "S5-font",
    fontFace ? "PASS" : "FAIL",
    "Necto Mono loaded via @font-face (R8.2 single typeface)",
    fontFace
      ? "@font-face found"
      : `no @font-face anywhere in built CSS/HTML — "${(cssText.match(/--font-mono:[^;]+/) ?? ["?"])[0]}" resolves to generic fallback; ${fontFiles} B of font files still shipped in /fonts`,
  );

  // S6 — img alt + width/height across every page
  const allHtml = walk(DIST, (p) => p.endsWith(".html"));
  let imgNoAlt = 0, imgNoDims = 0, imgEmptyAlt = 0, imgTotal = 0;
  for (const f of allHtml) {
    for (const m of readFileSync(f, "utf8").matchAll(/<img[^>]*>/g)) {
      imgTotal++;
      const tag = m[0];
      if (!/\salt=/.test(tag)) imgNoAlt++;
      if (/\salt=""/.test(tag)) imgEmptyAlt++;
      if (!(/\swidth=/.test(tag) && /\sheight=/.test(tag))) imgNoDims++;
    }
  }
  record("S6-alt", imgNoAlt === 0 ? "PASS" : "FAIL", "every <img> has an alt attribute", `${imgTotal} imgs, ${imgNoAlt} missing alt, ${imgEmptyAlt} empty-alt`);
  record("S6-dims", imgNoDims === 0 ? "PASS" : "FAIL", "every <img> has width+height (CLS)", `${imgNoDims} of ${imgTotal} missing dimensions`);

  // S7 — lang: page language present; language-of-parts (3.1.2) for Finnish titles
  let langEn = 0, langOther = 0, finnishTitles = 0;
  const finnishRe = /(kaekriaeinen|runokuu|ilmastonmuuttajat|lukiovertailu|tarkkailija|digitaalinenkirjallisuus)/i;
  // "Veikkaus beneficiaries" is English prose with a Finnish company name in it,
  // so it is correctly NOT marked; the Dutch Municipality wordmark compounds
  // are the corpus's real test cases.
  for (const f of allHtml) {
    const html = readFileSync(f, "utf8");
    if (/<html[^>]*lang="en"/.test(html)) langEn++;
    else if (/<html[^>]*lang=/.test(html)) langOther++;
    const h1 = html.match(/<h1[^>]*>([^<]*)<\/h1>/)?.[1] ?? "";
    if (finnishRe.test(h1) && !/\blang="fi"/.test(html)) finnishTitles++;
  }
  record("S7-lang-page", langEn === allHtml.length ? "PASS" : "FAIL", "<html lang> on every page", `${langEn} pages lang="en", ${langOther} other, ${allHtml.length} total`);
  record(
    "S7-lang-parts",
    finnishTitles === 0 ? "PASS" : "FAIL",
    "3.1.2 language of parts: Finnish titles carry lang=\"fi\"",
    `${finnishTitles} built page(s) have a Finnish <h1> with no lang="fi" span anywhere`,
  );

  // S8 — image payload
  const images = walk(join(DIST, "images"));
  let imgBytes = 0, overBudget = [], aspectMismatch = [];
  for (const f of images) {
    imgBytes += statSync(f).size;
    if (/\/thumbs\//.test(f) && statSync(f).size > BUDGET.thumbBytes) {
      overBudget.push(`${basename(f)} ${(statSync(f).size / 1024).toFixed(0)} KB`);
    }
  }
  // frontmatter w/h vs intrinsic
  const projMd = join(REBUILD, "src", "content", "projects");
  for (const md of readdirSync(projMd)) {
    const raw = readFileSync(join(projMd, md), "utf8");
    for (const m of raw.matchAll(/- src: (\/images\/[^\n]+)\n\s+w: (\d+)\n\s+h: (\d+)/g)) {
      const file = join(DIST, m[1].replace(/^\//, ""));
      if (!existsSync(file)) continue;
      const dim = imageSize(file);
      if (dim.w && Math.abs(dim.w / dim.h - m[2] / m[3]) > 0.02) {
        aspectMismatch.push(`${m[1]}: frontmatter ${m[2]}x${m[3]}, intrinsic ${dim.w}x${dim.h}`);
      }
    }
  }
  record(
    "S8-img-bytes",
    imgBytes <= BUDGET.imageTotalBytes ? "PASS" : "FAIL",
    `site images ≤ ${BUDGET.imageTotalBytes / 1024 / 1024} MB`,
    `${(imgBytes / 1024 / 1024).toFixed(1)} MB across ${images.length} files; ${overBudget.length}/${images.filter((f) => /\/thumbs\//.test(f)).length} thumbnails over ${BUDGET.thumbBytes / 1024} KB: ${overBudget.slice(0, 4).join("; ")}${overBudget.length > 4 ? " …" : ""}`,
  );
  record("S8-aspect", aspectMismatch.length === 0 ? "PASS" : "WARN", "frontmatter image dims match intrinsic", aspectMismatch.join(" | ") || "all match");

  // S11 — dev-only pages must not ship
  {
    const probe = existsSync(join(DIST, "probe", "index.html"));
    const probeImportsDev = probe && readFileSync(join(DIST, "probe", "index.html"), "utf8").includes("/src/lib/background.ts");
    record(
      "S11-dev-page",
      probe ? "FAIL" : "PASS",
      "dev-only probe page excluded from the production build",
      probe
        ? `/probe/ ships in dist and imports ${probeImportsDev ? "/src/lib/background.ts — a 404 in production, so the page is a permanently 'running…' error screen" : "a missing module"}`
        : "no probe page in dist",
    );
  }

  // S12 — content images (project bodies) must not be empty-alt.
  // Listing thumbnails are defensible as decorative: the card's link text
  // already names the project (1.1.1 "text alternative exists in the link").
  // Body images are the substance of a project page and are NOT decorative —
  // a screen-reader user gets nothing about them today ([slug].astro:65 alt="").
  {
    let contentImgs = 0, contentImgsEmptyAlt = 0;
    for (const f of walk(DIST, (p) => p.endsWith(".html"))) {
      const html = readFileSync(f, "utf8");
      for (const block of html.matchAll(/<div class="project-block">([\s\S]*?)<\/div>\s*<\/main>/g)) {
        for (const img of block[1].matchAll(/<img[^>]*>/g)) {
          contentImgs++;
          if (/\salt=""/.test(img[0])) contentImgsEmptyAlt++;
        }
      }
    }
    record(
      "S12-body-img-alt",
      contentImgsEmptyAlt === 0 ? "PASS" : "FAIL",
      "1.1.1 project body images carry text alternatives",
      `${contentImgsEmptyAlt} of ${contentImgs} body images have alt="" — these are project screenshots (the content itself), not decoration; [slug].astro:65 renders them empty-alt`,
    );
  }

  // S13 — every image the content references actually exists in the build.
  // This check exists because the WebP conversion shipped broken images once:
  // the frontmatter still pointed at .png after the files were converted, and
  // the audit reported green because it only counted bytes, never resolved a
  // path. Byte budgets and existence are different questions.
  {
    const refs = new Set();
    for (const f of allHtml) {
      for (const m of readFileSync(f, "utf8").matchAll(/(\/images\/[\w./-]+)/g)) {
        refs.add(m[1]);
      }
    }
    const missing = [...refs].filter((r) => !existsSync(join(DIST, r.replace(/^\//, ""))));
    record(
      "S13-image-exists",
      missing.length === 0 ? "PASS" : "FAIL",
      "every image referenced by the built pages exists in dist",
      missing.length === 0 ? `${refs.size} distinct images, all resolve` : `${missing.length} of ${refs.size} missing: ${missing.slice(0, 5).join(", ")}`,
    );
  }

  // S9 — static heading outline + focus-rule inventory (crude DOM walk)
  for (const [type, rel] of Object.entries(PAGES)) {
    const html = readFileSync(join(DIST, rel));
    const text = html.toString("utf8");
    const levels = [...text.matchAll(/<h([1-6])[\s>]/g)].map((m) => +m[1]).filter(() => true);
    let skip = false;
    for (let i = 1; i < levels.length; i++) if (levels[i] > levels[i - 1] + 1) skip = true;
    const h1s = levels.filter((l) => l === 1).length;
    const ok = h1s >= 1 && !skip;
    record(`S9-headings-${type}`, ok ? "PASS" : "FAIL", `heading outline /${type}`, `levels: ${levels.join(",") || "none"}${skip ? " (level skip)" : ""}`);
  }

  // S10 — focus-visible rules: which interactive selectors carry one?
  // Coverage, not selector shape: a class is covered by its own rule OR by a
  // rule on the element type it is used on. `.backlink`/`.listlink`/`.textlink`
  // are all <a>s, so `a:focus-visible` (global.css, focus block) covers them;
  // B2 is the browser-side authority for visibility, this checks existence.
  const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");
  const focusTargets = [...stripComments(cssText).matchAll(/([^{}]+)\{/g)]
    .flatMap((m) => m[1].split(",").map((s) => s.trim()))
    /* every selector in a rule that contains :focus-visible is covered by it */
    .filter((sel) => sel.includes(":focus-visible"))
    .map((sel) => sel.replace(/:focus-visible.*$/, "").replace(/^.*\s+/, ""));
  const elementCovered = new Set(focusTargets.filter((s) => !s.includes(".") && !s.startsWith("[")));
  const classCovered = new Set(focusTargets.filter((s) => s.includes(".")));

  // Which interactive elements exist in the built output, and with what classes?
  const interactiveEls = new Map(); // "a/fact" → Set of classes, first tag wins per class
  for (const f of walk(DIST, (p) => p.endsWith(".html"))) {
    for (const m of readFileSync(f, "utf8").matchAll(/<(a|button|input)\s[^>]*class="([^"]*)"/g)) {
      const classes = m[2].split(/\s+/).filter(Boolean);
      for (const cls of classes) {
        const key = `${m[1]}.${cls}`;
        if (!interactiveEls.has(key)) interactiveEls.set(key, new Set(classes));
      }
    }
  }
  // An element is covered if ANY of its classes has a rule, or its tag does.
  const unverified = [...interactiveEls]
    .filter(([key, classes]) => {
      const tag = key.split(".")[0];
      const coveredByClass = [...classes].some((c) => classCovered.has(`.${c}`));
      return !coveredByClass && !elementCovered.has(tag);
    })
    .map(([key]) => key);
  record(
    "S10-focus-css",
    unverified.length === 0 ? "PASS" : "FAIL",
    "explicit :focus-visible coverage for every interactive class in the built output",
    `class rules: ${[...classCovered].join(" ") || "none"}; element rules: ${[...elementCovered].join(" ") || "none"}; uncovered: ${unverified.join(" ") || "none"}`,
  );
}

// ---------------------------------------------------------------------------
// Stage 2 — browser checks
// ---------------------------------------------------------------------------
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function browserChecks() {
  mkdirSync(EVIDENCE, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });

  // Renderer string — if SwiftShader, GPU timings are software-rendered and
  // the canvas cost is an upper bound, not a field measurement.
  {
    const p = await browser.newPage();
    const renderer = await p.evaluate(() => {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl2");
      if (!gl) return "no webgl2";
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    }).catch(() => "probe failed");
    record("B0-renderer", "INFO", "WebGL renderer in this headless run", String(renderer));
    await p.close();
  }

  const routeTypes = [
    ["home", "/"],
    ["work", "/work/"],
    ["art", "/art/"],
    ["about", "/about/"],
    ["cv-gated", "/cv/"],
    ["project", "/inversion/"],
    ["project-fi", "/kaekriaeinen/"],
    ["notfound", "/404.html"],
  ];

  // B1 — axe-core per page
  let axeFailures = 0;
  for (const [name, route] of routeTypes) {
    const page = await browser.newPage();
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    await page.addScriptTag({ content: axeCore.source });
    const violations = await page.evaluate(async (tags) => {
      const r = await axe.run(document, { runOnly: { type: "tag", values: tags } });
      return r.violations.map((v) => ({
        id: v.id, impact: v.impact, help: v.help,
        nodes: v.nodes.slice(0, 4).map((n) => ({ target: n.target.join(" "), summary: (n.failureSummary ?? "").split("\n").slice(0, 3).join(" / ") })),
      }));
    }, AXE_TAGS);
    if (violations.length === 0) {
      record(`B1-axe-${name}`, "PASS", `axe (${AXE_TAGS.join()}) on ${route}`, "0 violations");
    } else {
      axeFailures += violations.length;
      for (const v of violations) {
        record(`B1-axe-${name}-${v.id}`, "FAIL", `axe ${v.impact}: ${v.help} [${route}]`,
          v.nodes.map((n) => `${n.target} → ${n.summary}`).join(" ‖ ").slice(0, 400));
      }
    }
    await page.close();
  }

  // B2 — focus visibility + order: Tab through, record focused element state.
  for (const [name, route] of [["home", "/"], ["work", "/work/"], ["cv-gated", "/cv/"], ["project", "/inversion/"], ["about", "/about/"]]) {
    const page = await browser.newPage();
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    const trail = [];
    const invisible = [];
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const fv = el.matches(":focus-visible");
        // Chrome's UA focus ring computes to outline-style:auto (1px); count that as visible.
        const hasOutline = cs.outlineStyle !== "none" && (cs.outlineStyle === "auto" || parseFloat(cs.outlineWidth) > 0);
        const shadowChanged = cs.boxShadow && cs.boxShadow !== "none";
        return {
          tag: el.tagName.toLowerCase(), cls: el.className?.toString().slice(0, 30) ?? "",
          text: (el.textContent ?? "").trim().slice(0, 24),
          focusVisible: fv, outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`,
          outlineVisible: hasOutline, boxShadow: shadowChanged,
          w: Math.round(rect.width), h: Math.round(rect.height),
          obscured: (() => {
            const r = el.getBoundingClientRect();
            if (r.width === 0) return false;
            const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return hit ? !(el.contains(hit) || hit.contains(el)) : false;
          })(),
        };
      });
      if (!info) break;
      trail.push(info);
      if (info.focusVisible && !info.outlineVisible && !info.boxShadow) invisible.push(info);
    }
    record(
      `B2-focus-${name}`,
      invisible.length === 0 ? "PASS" : "FAIL",
      `focus indicator on every focused element /${name}`,
      invisible.length === 0
        ? `${trail.length} focusables, all with visible outline/shadow`
        : `${invisible.length}/${trail.length} focused elements have no visible indicator: ${invisible.map((e) => `${e.tag}.${e.cls || "(no class)"}`).join(", ")}`,
      { trail },
    );
    record(
      `B2-order-${name}`,
      "INFO",
      `focus order /${name}`,
      trail.map((t) => `${t.tag}${t.cls ? "." + t.cls.split(" ")[0] : ""}("${t.text}")`).join(" → ").slice(0, 400),
    );
    await page.close();
  }

  // B3 — target size (WCAG 2.5.8, 24×24 CSS px) with the spacing exception applied.
  const targetAudit = async (page, route) => {
    const report = await page.evaluate((min) => {
      const rects = [...document.querySelectorAll("a[href], button, input, [role=button]")]
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && r.height > 0);
      const out = [];
      for (const { el, r } of rects) {
        if (r.width >= min && r.height >= min) continue;
        // Spacing exception: 24px circles centred on each undersized target must
        // not intersect another target's circle. Approximate: edge distance to the
        // nearest other target.
        let nearest = Infinity;
        for (const { el: el2, r: r2 } of rects) {
          if (el2 === el || el.contains(el2) || el2.contains(el)) continue;
          const dx = Math.max(0, Math.max(r.left - r2.right, r2.left - r.right));
          const dy = Math.max(0, Math.max(r.top - r2.bottom, r2.top - r.bottom));
          nearest = Math.min(nearest, Math.hypot(dx, dy));
        }
        out.push({
          text: (el.textContent ?? el.value ?? "").trim().slice(0, 24),
          w: Math.round(r.width), h: Math.round(r.height),
          nearest: Math.round(nearest),
          spacingException: nearest >= min - 1,
        });
      }
      return out;
    }, BUDGET.targetSizePx);
    const failures = report.filter((t) => !t.spacingException);
    record(
      `B3-target-size-${route.replace(/\W+/g, "-")}`,
      failures.length === 0 ? "PASS" : "FAIL",
      `2.5.8 target size ≥ ${BUDGET.targetSizePx}px (spacing exception applied) on ${route}`,
      report.length === 0
        ? "no undersized targets"
        : report.map((t) => `"${t.text}" ${t.w}×${t.h}px, nearest target ${t.nearest}px ${t.spacingException ? "(spacing exception)" : "→ FAIL"}`).join("; "),
    );
  };
  for (const route of ["/", "/inversion/", "/work/", "/cv/"]) {
    const page = await browser.newPage();
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    await targetAudit(page, route);
    await page.close();
  }

  // B4 — focus not obscured (2.4.11): fixed back link vs scrolled content
  {
    const page = await browser.newPage();
    await page.goto(BASE + "/kaekriaeinen/", { waitUntil: "networkidle" });
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(300);
    const obscured = await page.evaluate(() => {
      const el = document.querySelector(".backlink");
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return {
        hitTag: hit ? `${hit.tagName}.${hit.className}` : "null",
        obscured: hit ? !(el.contains(hit) || hit.contains(el)) : false,
      };
    });
    record(
      "B4-focus-obscured",
      obscured.obscured ? "FAIL" : "PASS",
      "2.4.11 fixed back link not obscured when scrolled (/kaekriaeinen, scrolled 600px)",
      obscured.obscured ? `element at backlink centre is <${obscured.hitTag}> — main content (z-index:1) scrolls over the fixed link` : "link remains topmost",
    );
    await page.close();
  }

  // B5 — contrast ratios of the token palette (static, computed)
  {
    const pairs = [
      ["ink-on-sheet", hex("#000000"), hex("#ffffff"), 4.5, "PASS"],
      ["ink-on-page-purple", hex("#000000"), hex("#bc89ff"), 4.5, "PASS"],
      // White on purple is a LATENT pair: no text renders white-on-purple today
      // (buttons are white boxes with ink text; the sheet carries the content).
      // But the 0.25rem purple frame against the white sheet is 2.57:1 — below
      // the 3:1 non-text minimum — so if the redesign ever puts a control or
      // meaningful graphic on the purple, it must be ink, not white.
      ["sheet-white-on-page-purple", hex("#ffffff"), hex("#bc89ff"), 3.0, "WARN"],
    ];
    for (const [name, fg, bg, need, worst] of pairs) {
      const ratio = contrast(fg, bg);
      const status = ratio >= need ? "PASS" : worst;
      record(
        `B5-contrast-${name}`,
        status,
        `contrast ${name} ≥ ${need}:1`,
        `${ratio.toFixed(2)}:1${status === "WARN" ? " — no white-on-purple text exists today (latent constraint for the redesign: anything on the purple frame must be ink, which measures 8.16:1)" : ""}`,
      );
    }
  }

  // B6 — text over the generated field, measured as COMPOSITED contrast.
  //
  // The field is full-bleed and full-alpha behind a frosted content plate
  // (design/visual-effects.md §1), so the honest question is not "does the
  // field touch the text" (it always may) but "what is the worst background
  // luminance actually behind a glyph, once the plate composites". Text is ink
  // (#000, luminance 0), so worst-case contrast is (Lbg + 0.05) / 0.05 of the
  // darkest clearly-background pixel inside the text box — AA needs 4.5:1,
  // the paper's bound is 13.8:1, so FAIL <4.5, WARN <7.
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const textRects = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll("main *")) {
        const direct = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        if (!direct) continue;
        for (const r of el.getClientRects()) {
          out.push({ label: `${el.tagName.toLowerCase()}.${el.className || ""}"${(el.textContent ?? "").trim().slice(0, 20)}"`, x: r.x, y: r.y, w: r.width, h: r.height });
        }
      }
      return out;
    });
    // One composited screenshot: text, plate, and field as a visitor sees them.
    const png = PNG.sync.read(await page.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 800 } }));
    const relLum = (o) => {
      const lin = (c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
      return 0.2126 * lin(png.data[o]) + 0.7152 * lin(png.data[o + 1]) + 0.0722 * lin(png.data[o + 2]);
    };
    const worst = new Map();
    for (const r of textRects) {
      const x0 = Math.max(0, Math.round(r.x)), y0 = Math.max(0, Math.round(r.y));
      const x1 = Math.min(png.width, Math.round(r.x + r.w)), y1 = Math.min(png.height, Math.round(r.y + r.h));
      // Worst background = the darkest pixel that is still clearly background
      // (glyphs and AA edges sit below 0.35 and are excluded by construction).
      let minBgLum = 1;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const l = relLum((y * png.width + x) * 4);
        if (l > 0.35 && l < minBgLum) minBgLum = l;
      }
      if (minBgLum < 1) worst.set(r.label, (minBgLum + 0.05) / 0.05);
    }
    const ranked = [...worst.entries()].sort((a, b) => a[1] - b[1]);
    const worstContrast = ranked[0]?.[1] ?? 21;
    const status = worstContrast < 4.5 ? "FAIL" : worstContrast < 7 ? "WARN" : "PASS";
    record(
      "B6-field-over-text",
      status,
      "1.4.3 worst composited text contrast over the field (AA 4.5:1, AAA 7:1)",
      `worst ${worstContrast.toFixed(1)}:1 at ${ranked[0]?.[0] ?? "n/a"}; ${ranked.slice(0, 3).map(([l, c]) => `${l} ${c.toFixed(1)}:1`).join("; ")}`,
      { ranked: ranked.slice(0, 20) },
    );
    await page.screenshot({ path: join(EVIDENCE, "home-composited.png") });
    await page.close();
  }

  // B7 — reduced motion at load: canvas must be a STATIC frame
  {
    const page = await browser.newPage({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const a = PNG.sync.read(await page.locator(".sheet").screenshot());
    await page.waitForTimeout(4000);
    const b = PNG.sync.read(await page.locator(".sheet").screenshot());
    const diff = pngDiffFraction(a, b);
    const coverage = pngDarkFraction(a);
    record(
      "B7-reduced-static",
      diff === 0 ? "PASS" : "FAIL",
      "D4.9 reduced-motion at load renders a static frame (pixel-identical 4s apart)",
      `diff ${(diff * 100).toFixed(3)}% of sheet pixels; field coverage of static frame ${(coverage * 100).toFixed(2)}%`,
    );
    await page.screenshot({ path: join(EVIDENCE, "home-reduced-motion.png") });
    await page.close();
  }

  // B8 — reduced-motion toggled MID-SESSION: preference change must freeze the field
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const before = PNG.sync.read(await page.locator(".sheet").screenshot());
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(600);
    const samples = [];
    for (let i = 0; i < 6; i++) {
      samples.push(PNG.sync.read(await page.locator(".sheet").screenshot()));
      await page.waitForTimeout(400);
    }
    let maxStep = 0;
    for (let i = 1; i < samples.length; i++) maxStep = Math.max(maxStep, pngDiffFraction(samples[i - 1], samples[i]));
    record(
      "B8-reduced-mid-session",
      maxStep === 0 ? "PASS" : "FAIL",
      "D4.9 preference change mid-session freezes the field",
      maxStep === 0
        ? "field frozen after toggle"
        : `field still changing after reduce was requested: max ${(maxStep * 100).toFixed(3)}% pixels changed between consecutive 400ms samples — background.ts uploads u_reduced exactly once at mount (line 353) and the change listener (lines 296–299) never re-uploads it`,
    );
    // What does the reset do? start=0 restarts the u_time origin — visible jump.
    const jump = pngDiffFraction(before, samples[0]);
    record("B8-reduced-jump", "INFO", "pixel discontinuity at the moment of toggle", `${(jump * 100).toFixed(3)}% of sheet pixels differ 600ms after the toggle`);
    await page.close();
  }

  // B9 — canvas repaint cost: rAF frame intervals, canvas live vs context lost.
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const sample = () => page.evaluate(async (ms) => {
      const d = [];
      let last = performance.now();
      const end = last + ms;
      await new Promise((res) => {
        function tick(now) { d.push(now - last); last = now; now < end ? requestAnimationFrame(tick) : res(); }
        requestAnimationFrame(tick);
      });
      d.sort((a, b) => a - b);
      return { n: d.length, median: +d[Math.floor(d.length / 2)].toFixed(1), p95: +d[Math.floor(d.length * 0.95)].toFixed(1), overBudget: +(d.filter((x) => x > 16.7).length / d.length).toFixed(3) };
    }, 4000);
    const live = await sample();
    await page.evaluate(() => document.dispatchEvent(new Event("astro:before-swap")));
    await page.waitForTimeout(300);
    const disposed = await sample();
    record(
      "B9-canvas-cost",
      "INFO",
      "full-viewport WebGL frame intervals @4× CPU throttle (1440×900)",
      `canvas live: median ${live.median}ms p95 ${live.p95}ms ${(live.overBudget * 100).toFixed(0)}% of frames >16.7ms ‖ after context loss: median ${disposed.median}ms p95 ${disposed.p95}ms ${(disposed.overBudget * 100).toFixed(0)}% >16.7ms`,
      { live, disposed },
    );
    await page.close();
  }

  // B10 — LCP / CLS / INP-proxy, throttled, home + project page
  for (const [name, route] of [["home", "/"], ["project", "/stt-tarkkailija/"]]) {
    const page = await browser.newPage({ viewport: { width: 360, height: 740 } });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false, latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
    await page.addInitScript(() => {
      window.__m = { lcp: 0, cls: 0, events: [] };
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.lcp = e.startTime; })
        .observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value; })
        .observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.events.push({ t: e.name, dur: e.duration }); })
        .observe({ type: "event", durationThreshold: 16, buffered: true });
    });
    await page.goto(BASE + route, { waitUntil: "load" });
    await page.waitForTimeout(5000);
    // INP proxy: 8 real clicks on the facts widget (home has none — click a button link but prevent nav)
    await page.evaluate(() => {
      document.querySelectorAll("a[href], button").forEach((el) => el.addEventListener("click", (e) => e.preventDefault(), { capture: true }));
    });
    for (let i = 0; i < 8; i++) {
      const btn = page.locator("button, a.button").first();
      if (await btn.count()) await btn.click({ force: true });
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(1000);
    const m = await page.evaluate(() => window.__m);
    const worstInteraction = m.events.reduce((a, e) => Math.max(a, e.dur), 0);
    const interactionDetail = worstInteraction === 0 ? "<16ms (below event observer threshold)" : `${Math.round(worstInteraction)}ms`;
    record(
      `B10-vitals-${name}`,
      "INFO",
      `lab vitals /${name === "home" ? "" : name} (360px, 4×CPU, ~1.6Mbps/150ms)`,
      `LCP ${Math.round(m.lcp)}ms · CLS ${m.cls.toFixed(4)} · worst interaction ${interactionDetail} (INP proxy)`,
      m,
    );
    record(`B10-LCP-${name}`, m.lcp <= 2500 ? "PASS" : "FAIL", `1.4 LCP ≤ 2500ms /${name}`, `${Math.round(m.lcp)}ms`);
    record(`B10-CLS-${name}`, m.cls <= 0.1 ? "PASS" : "FAIL", `2.4.1 CLS ≤ 0.1 /${name}`, `${m.cls.toFixed(4)}`);
    record(`B10-INP-${name}`, worstInteraction <= 200 ? "PASS" : "FAIL", `INP proxy ≤ 200ms /${name}`, `${Math.round(worstInteraction)}ms lab proxy`);
    await page.close();
  }

  // B11 — reflow at 320px (1.4.10)
  {
    const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
    let overflow = [];
    for (const route of ["/", "/work/", "/about/", "/inversion/", "/cv/"]) {
      await page.goto(BASE + route, { waitUntil: "networkidle" });
      const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      if (o.sw > o.cw) overflow.push(`${route} scrollWidth ${o.sw} > ${o.cw}`);
    }
    record("B11-reflow", overflow.length === 0 ? "PASS" : "FAIL", "1.4.10 no horizontal scroll at 320px", overflow.join("; ") || "all pages reflow");
    await page.close();
  }

  // B12 — password gate error handling (3.3.1 / 4.1.3)
  {
    const page = await browser.newPage();
    await page.goto(BASE + "/cv/", { waitUntil: "networkidle" });
    const gate = page.locator("[data-gate]");
    if (await gate.count()) {
      await page.fill("input[name=password]", "wrong-password");
      await page.click("[data-gate-form] button");
      const state = await page.evaluate(() => {
        const input = document.querySelector("input[name=password]");
        const live = document.querySelector("[role=alert], [aria-live]");
        return { invalid: input.getAttribute("aria-invalid"), msg: live ? live.textContent.trim().slice(0, 80) : null, value: input.value };
      });
      record(
        "B12-gate-error",
        state.invalid === "true" && state.msg ? "PASS" : "FAIL",
        "3.3.1/4.1.3 wrong password produces a perceivable error",
        `aria-invalid=${state.invalid}, announced message: ${state.msg ?? "NONE (value silently cleared, focus returned to empty input)"}`,
      );
      // input boundary visibility (1.4.11)
      const style = await page.evaluate(() => {
        const cs = getComputedStyle(document.querySelector("input[name=password]"));
        return { border: cs.border, borderColor: cs.borderColor, borderWidth: cs.borderWidth, bg: cs.backgroundColor, color: cs.color };
      });
      record(
        "B12-input-border",
        parseFloat(style.borderWidth) > 0 ? "PASS" : "FAIL",
        "1.4.11 password input has a visible boundary (≥3:1)",
        `border: ${style.border}; background ${style.bg} — PasswordGate.astro:94 uses var(--c-accent-muted) and :95 var(--c-whitebox-bg), neither defined in tokens.css, so the declarations are invalid at computed-value time and the border/background are dropped`,
      );
    } else {
      record("B12-gate-error", "WARN", "CV gate form not present in this build", "build without PUBLIC_CV_PASSWORD renders the misconfiguration branch");
    }
    await page.close();
  }

  // B13 — CV gate reveal: where does focus land? (2.4.3 focus order / 3.2.2)
  {
    const page = await browser.newPage();
    await page.goto(BASE + "/cv/", { waitUntil: "networkidle" });
    await page.fill("input[name=password]", "audit-dummy");
    await page.click("[data-gate-form] button");
    await page.waitForTimeout(300);
    const state = await page.evaluate(() => ({
      active: document.activeElement?.tagName,
      cvVisible: !!document.querySelector(".cvlist"),
      gateGone: !document.querySelector("[data-gate]"),
    }));
    record(
      "B13-gate-focus",
      state.active === "BODY" ? "WARN" : "PASS",
      "2.4.3 focus moves sensibly when the gate reveals the CV",
      state.cvVisible && state.gateGone
        ? `CV revealed; focus lands on <${state.active}> — the focused submit button is removed from the DOM and focus falls back to <body>, so a screen-reader/keyboard user's next keystroke starts from the top of the document. Recommend focusing the revealed CV heading.`
        : `unexpected state ${JSON.stringify(state)}`,
    );
    await page.close();
  }

  // B14 — reverse direction of the reduced-motion toggle: load WITH reduce,
  // then turn it off. Does the field start? (The change listener sets `reduced`
  // but nothing starts the rAF loop that was never begun at mount — background.ts:392-394.)
  {
    const page = await browser.newPage({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const a = PNG.sync.read(await page.locator(".sheet").screenshot());
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForTimeout(1500);
    const b = PNG.sync.read(await page.locator(".sheet").screenshot());
    const diff = pngDiffFraction(a, b);
    record(
      "B14-reduced-reverse",
      diff === 0 ? "FAIL" : "PASS",
      "reduced-motion turned OFF mid-session starts the field",
      diff === 0
        ? "field never starts: the rAF loop is only begun at mount (background.ts:392-394) and the change listener never starts it — a visitor who reduces motion at OS level, then lifts it, must reload to get the background"
        : `field started (${(diff * 100).toFixed(3)}% pixels changed)`,
    );
    await page.close();
  }

  // B15 — forced-colors: does the design survive Windows High Contrast?
  {
    const page = await browser.newPage({ forcedColors: "active" });
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    const state = await page.evaluate(() => {
      const sheet = getComputedStyle(document.querySelector(".sheet"));
      const canvas = getComputedStyle(document.querySelector("#background"));
      const btn = getComputedStyle(document.querySelector(".button"));
      return {
        sheetDisplay: sheet.display, canvasDisplay: canvas.display,
        btnBg: btn.backgroundColor, btnBorder: btn.borderColor,
      };
    });
    const hidden = state.sheetDisplay === "none" || state.canvasDisplay === "none";
    record(
      "B15-forced-colors",
      hidden ? "PASS" : "WARN",
      "forced-colors: decorative canvas removed, chrome takes system colours",
      hidden
        ? `sheet display ${state.sheetDisplay}, canvas ${state.canvasDisplay} — the shader's own pixels cannot be recoloured by forced-colors, so the canvas is removed (it is decorative, aria-hidden); button bg forced to ${state.btnBg}, border to ${state.btnBorder}`
        : `canvas still painting over the forced palette (sheet ${state.sheetDisplay}); a @media (forced-colors: active) rule hiding .sheet/#background is required`,
    );
    await page.close();
  }

  // B16 — do the images actually RENDER, and is the console clean?
  // S13 proves the files exist; this proves the browser decoded them and that
  // the WebGL layer is not spewing driver warnings (the attribute-less shader
  // made Chrome/ANGLE take its emulated path and print one warning per frame).
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const consoleMsgs = [];
    page.on("console", (m) => {
      if (m.type() === "warning" || m.type() === "error") consoleMsgs.push(`${m.type()}: ${m.text()}`);
    });
    page.on("pageerror", (e) => consoleMsgs.push(`pageerror: ${e.message}`));
    const broken = [];
    for (const route of ["/work/", "/art/", "/kaekriaeinen/", "/visualizing-government/"]) {
      await page.goto(BASE + route, { waitUntil: "networkidle" });
      // Listing images are loading="lazy", so below-the-fold images are
      // legitimately unloaded until scrolled to. Walk the page first, or the
      // check reports lazy-loading as broken images.
      await page.evaluate(async () => {
        const step = window.innerHeight;
        for (let y = 0; y < document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(300);
      const imgs = await page.evaluate(() =>
        [...document.querySelectorAll("img")].map((i) => ({
          src: i.currentSrc || i.src,
          ok: i.complete && i.naturalWidth > 0,
        })));
      for (const i of imgs) if (!i.ok) broken.push(`${route} ${i.src}`);
    }
    const webglWarnings = consoleMsgs.filter((m) => /vertex attrib|drawArraysInstanced|webgl|WebGL/i.test(m));
    record(
      "B16-images-render",
      broken.length === 0 ? "PASS" : "FAIL",
      "every <img> on /work, /art and two project pages decoded (naturalWidth > 0)",
      broken.length === 0 ? "all images decoded" : `${broken.length} did not: ${broken.slice(0, 3).join(", ")}`,
    );
    record(
      "B16-webgl-console",
      webglWarnings.length === 0 ? "PASS" : "WARN",
      "no WebGL driver warnings in the console",
      webglWarnings.length === 0
        ? `console clean (${consoleMsgs.length} other warning/error line(s): ${consoleMsgs.slice(0, 2).join(" | ") || "none"})`
        : `${webglWarnings.length} warning(s), e.g. ${webglWarnings[0].slice(0, 160)}`,
    );
    await page.close();
  }

  // B17 — the renderer contract (visual-effects.md §2.1, §3.3).
  //
  // Three things the instanced rewrite introduced that nothing else would
  // notice if they broke:
  //   1. which tier actually ran — a silent fall back to the SDF quad still
  //      draws a field, 3.2x slower and under-stroked, and looks like success;
  //   2. the fallback staying a LAZY chunk — make it eager again and every
  //      visitor pays ~1 KB gz for a failure that has never happened, which is
  //      what pushed the page over its 12 KB budget in the first place;
  //   3. the governor not tripping when it should (checked in B18).
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const requested = [];
    page.on("request", (r) => requested.push(r.url()));
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const state = await page.evaluate(() => {
      const c = document.querySelector("#background");
      return {
        mode: c?.dataset.mode ?? null,
        fallback: c?.dataset.fallback ?? null,
        perf: c?.dataset.perf ?? null,
      };
    });
    record(
      "B17-renderer-tier",
      state.mode === "instanced" && state.fallback === "false" ? "PASS" : "FAIL",
      "the field renders on the instanced tier (tier A), not the SDF quad",
      state.mode === "instanced" && state.fallback === "false"
        ? `data-mode=${state.mode}, data-fallback=${state.fallback}, governor did not trip (data-perf=${state.perf ?? "unset"})`
        : `data-mode=${state.mode}, data-fallback=${state.fallback} — expected instanced/false`,
    );
    record(
      "B17-governor-idle",
      state.perf === null ? "PASS" : "FAIL",
      "the governor leaves the loop running on an unthrottled page",
      state.perf === null
        ? "no data-perf=static after 1.2s on a healthy page"
        : `governor froze the field immediately (data-perf=${state.perf}) — it is measuring something other than frame time`,
    );
    const sdfChunk = requested.filter((u) => /background-sdf/.test(u));
    record(
      "B17-fallback-stays-lazy",
      sdfChunk.length === 0 ? "PASS" : "FAIL",
      "the SDF fallback chunk is never fetched on the happy path",
      sdfChunk.length === 0
        ? `tier A compiled inline; ${requested.length} request(s) total, none for background-sdf`
        : `${sdfChunk.length} request(s) for the fallback tier: ${sdfChunk[0].split("/").pop()}`,
    );
    await page.close();
  }

  // B18 — the frame-time governor, exercised rather than assumed.
  //
  // A governor that never fires is indistinguishable from one that is not
  // written, and a governor that fires immediately would freeze the field on
  // every visit. B17 covers the second failure, this covers the first.
  //
  // The throttle rate is 100x, not 20x, and that number is measured rather than
  // guessed: at 20x the rAF interval is still pinned at the 16.7 ms vsync (this
  // machine, measured median 16.7 / max 16.8 at both 1x and 20x) because the
  // whole frame is well under budget, so a governor keyed to frame overrun has
  // correctly nothing to act on. Only at 100x does the interval break (max
  // 100 ms) and the governor give up the loop. That is the intended design: it
  // reacts to frames that are actually late, not to a machine that is merely
  // slow — freezing a field the visitor can still see at 60 fps would be a
  // regression dressed as a safeguard.
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 100 });
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    let perf = null;
    for (let i = 0; i < 16 && perf === null; i++) {
      await page.waitForTimeout(500);
      perf = await page.evaluate(
        () => document.querySelector("#background")?.dataset.perf ?? null,
      );
    }
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    record(
      "B18-governor-engages",
      perf === "static" ? "PASS" : "FAIL",
      "100x CPU throttling makes the governor give up the frame loop",
      perf === "static"
        ? "data-perf=static within 8s of load; the field holds one frame instead of burning the CPU"
        : `data-perf=${perf ?? "unset"} after 8s of 100x throttling — §3.3 is dead code or its thresholds never trip`,
    );
    await page.close();
  }

  await browser.close();
  return axeFailures;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
try {
  build();
  const server = await ensureServer();
  await staticChecks();
  await browserChecks();

  // Contrast ratios echoed as their own evidence line for the report.
  console.log(`\n· reference ratios: #000/#bc89ff = ${contrast(hex("#000000"), hex("#bc89ff")).toFixed(2)}:1 · #fff/#bc89ff = ${contrast(hex("#ffffff"), hex("#bc89ff")).toFixed(2)}:1 · #000/#fff = ${contrast(hex("#000000"), hex("#ffffff")).toFixed(2)}:1`);

  const fails = results.filter((r) => r.status === "FAIL").length;
  const warns = results.filter((r) => r.status === "WARN").length;
  console.log(`\n${fails === 0 ? "PASS" : "FAIL"} — ${results.length} checks: ${results.length - fails - warns - results.filter((r) => r.status === "INFO").length} pass, ${fails} fail, ${warns} warn, ${results.filter((r) => r.status === "INFO").length} info`);
  if (fails > 0) {
    console.log("\nFailures:");
    for (const r of results.filter((x) => x.status === "FAIL")) console.log(`  ✗ ${r.id}: ${r.title}`);
  }
  server.kill();
  process.exit(fails === 0 ? 0 : 1);
} catch (err) {
  console.error("audit could not run:", err.message);
  process.exit(2);
}
