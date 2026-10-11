#!/usr/bin/env node
/*
 * WebP conversion for rebuild/public/images.
 *
 * Measured baseline (design/accessibility-performance.md Part 2.5): 13.0 MB of
 * PNG over 59 files; 16 of 18 thumbnails over 150 KB, max 716 KB, shipped at
 * 1000px and displayed at ≤640px. Same-fidelity WebP:
 *   thumbs q80, full size:  8.13 MB -> 766 KB (10.6x)
 *   thumbs q80 @640w:                           377 KB (21.5x)
 *
 * This script converts every raster image to .webp in place, updates the
 * frontmatter that references them (thumbnail + images[].src in
 * src/content/projects/*.md), and leaves the originals for the git history to
 * keep. The one SVG (visualizing-government-1.svg, 974 KB, an exported
 * illustration) is rasterised first — WebP cannot contain SVG, and the display
 * size is 608px.
 *
 * Run:  node design/audit/webp.mjs [--dry-run]
 * Needs: cwebp + ImageMagick (magick) on PATH.
 */
import { readdirSync, readFileSync, writeFileSync, statSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";

const REPO = new URL("../../rebuild", import.meta.url).pathname;
const IMAGES = join(REPO, "public", "images");
const CONTENT = join(REPO, "src", "content", "projects");
const dryRun = process.argv.includes("--dry-run");

// Quality chosen from the measured set: q80 keeps the 1-bit dithered retro art
// clean (it is banding-critical) while cutting the photographic screenshots to
// ~12-18% of their PNG size.
const Q = "80";

function listFiles(dir, filter = () => true) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? listFiles(p, filter) : filter(p) ? [p] : [];
  });
}

const rasters = listFiles(IMAGES, (p) => /\.(png|jpe?g)$/i.test(p));
const svgs = listFiles(IMAGES, (p) => /\.svg$/i.test(p));

let before = 0, after = 0;
const converted = new Map();

for (const src of [...rasters, ...svgs]) {
  const out = src.replace(/\.[^.]+$/, ".webp");
  if (src.endsWith(".svg")) {
    // Rasterise the exported illustration at 2x its 608px display width.
    const tmp = src + ".raster.png";
    if (!dryRun) {
      execFileSync("magick", [
        "-density", "144", "-background", "white",
        src, "-resize", "1216x",
        "-strip", tmp,
      ], { stdio: "ignore" });
    }
    if (!dryRun) execFileSync("cwebp", ["-quiet", "-q", Q, tmp, "-o", out], { stdio: "ignore" });
    if (!dryRun) unlinkSync(tmp);
  } else {
    // Thumbnails are displayed at ≤640px wide; cap the encode there. Body
    // images already are 640px and are left at full size.
    const isThumb = /\/thumbs\//.test(src);
    if (!dryRun) {
      if (isThumb) {
        execFileSync("cwebp", ["-quiet", "-q", Q, "-resize", "1280", "0", src, "-o", out], { stdio: "ignore" });
      } else {
        execFileSync("cwebp", ["-quiet", "-q", Q, src, "-o", out], { stdio: "ignore" });
      }
    }
  }
  const oldSize = statSync(src).size;
  const newSize = dryRun ? 0 : statSync(out).size;
  before += oldSize;
  after += newSize;
  converted.set(src, out);
  if (!dryRun && !src.endsWith(".svg")) unlinkSync(src); // git history keeps the PNG
  if (!dryRun && src.endsWith(".svg")) unlinkSync(src); // and the SVG
  console.log(`${dryRun ? "·" : "✓"} ${src.replace(REPO, "")} ${(oldSize / 1024).toFixed(0)}KB → ${(newSize / 1024).toFixed(0)}KB`);
}

// Repoint frontmatter references.
for (const md of readdirSync(CONTENT)) {
  if (!md.endsWith(".md")) continue;
  const p = join(CONTENT, md);
  let raw = readFileSync(p, "utf8");
  const beforeRaw = raw;
  for (const [from, to] of converted) {
    raw = raw.split(from.replace(REPO + "public", "")).join(to.replace(REPO + "public", ""));
  }
  if (raw !== beforeRaw) {
    if (!dryRun) writeFileSync(p, raw);
    console.log(`${dryRun ? "·" : "✓"} frontmatter updated: ${md}`);
  }
}

console.log(`\n${dryRun ? "would convert" : "converted"} ${converted.size} files: ${(before / 1024 / 1024).toFixed(2)} MB → ${(after / 1024 / 1024).toFixed(2)} MB (${(before / after).toFixed(1)}x)`);
