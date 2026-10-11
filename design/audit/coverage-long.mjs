import { chromium } from "playwright-core";
import { PNG } from "pngjs";
const BASE = "http://127.0.0.1:4321";

const browser = await chromium.launch({ channel: "chrome", headless: true });

async function coverageRun(page, label, seconds, stepMs) {
  const rects = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("main *")) {
      const direct = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!direct) continue;
      for (const r of el.getClientRects()) {
        out.push({ label: `${el.tagName.toLowerCase()}"${(el.textContent ?? "").trim().slice(0, 18)}"`, x: r.x, y: r.y, w: r.width, h: r.height });
      }
    }
    return out;
  });
  const sheetBox = await page.locator(".sheet").boundingBox();
  // Hide text so only field pixels are dark in the screenshots.
  await page.evaluate(() => (document.querySelector("main").style.visibility = "hidden"));
  const worst = new Map();
  const samples = Math.floor((seconds * 1000) / stepMs);
  for (let i = 0; i < samples; i++) {
    const png = PNG.sync.read(await page.locator(".sheet").screenshot());
    for (const r of rects) {
      const x0 = Math.max(0, Math.round(r.x - sheetBox.x)), y0 = Math.max(0, Math.round(r.y - sheetBox.y));
      const x1 = Math.min(png.width, Math.round(r.x + r.w - sheetBox.x)), y1 = Math.min(png.height, Math.round(r.y + r.h - sheetBox.y));
      let dark = 0, tot = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const o = (y * png.width + x) * 4;
        tot++;
        if (0.2126 * png.data[o] + 0.7152 * png.data[o + 1] + 0.0722 * png.data[o + 2] < 128) dark++;
      }
      if (tot > 0) worst.set(r.label, Math.max(worst.get(r.label) ?? 0, dark / tot));
    }
    await page.waitForTimeout(stepMs);
  }
  const top = [...worst.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  console.log(`${label}: ${samples} samples over ${seconds}s — worst text-box coverage: ${top.map(([l, v]) => `${l} ${(v * 100).toFixed(1)}%`).join("; ")}`);
  return top;
}

// Long window on desktop — the spin drift rotates elements over minutes.
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await coverageRun(page, "desktop 1280×800 / 90s", 90, 1500);
  await page.close();
}

// Mobile viewport — field positions are fixed px from centre, text column is the full width.
for (const [w, h] of [[360, 740], [1920, 1080]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await coverageRun(page, `viewport ${w}×${h} / 20s`, 20, 500);
  await page.screenshot({ path: `evidence/home-${w}x${h}.png` });
  await page.close();
}

// Listing page over 30s
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(BASE + "/work/", { waitUntil: "networkidle" });
  await coverageRun(page, "/work/ 1280×800 / 30s", 30, 750);
  await page.close();
}

await browser.close();
