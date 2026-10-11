import { chromium } from "playwright-core";
const BASE = "http://127.0.0.1:4321";
const browser = await chromium.launch({ channel: "chrome", headless: true });

// LCP on the listing pages (thumbnails are the LCP candidates), throttled.
for (const route of ["/work/", "/art/", "/about/", "/cv/"]) {
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
    window.__lcp = 0; window.__lcpEl = "";
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) { window.__lcp = e.startTime; window.__lcpEl = (e.url ?? e.element?.tagName ?? ""); }
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  await page.goto(BASE + route, { waitUntil: "load" });
  await page.waitForTimeout(6000);
  const m = await page.evaluate(() => ({ lcp: window.__lcp, el: window.__lcpEl }));
  console.log(`${route} — LCP ${Math.round(m.lcp)}ms (element: ${m.el})`);
  await page.close();
}

// Gate: correct password — where does focus land after reveal?
{
  const page = await browser.newPage();
  await page.goto(BASE + "/cv/", { waitUntil: "networkidle" });
  await page.fill("input[name=password]", "audit-dummy");
  await page.click("[data-gate-form] button");
  await page.waitForTimeout(300);
  const state = await page.evaluate(() => ({
    active: document.activeElement?.tagName + "." + (document.activeElement?.className ?? ""),
    cvVisible: !!document.querySelector(".cvlist"),
    gateGone: !document.querySelector("[data-gate]"),
  }));
  console.log("gate reveal:", JSON.stringify(state));
  await page.close();
}

// Forced-colors: what does the page look like?
{
  const page = await browser.newPage({ forcedColors: "active" });
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const cs = await page.evaluate(() => {
    const sheet = getComputedStyle(document.querySelector(".sheet"));
    const btn = getComputedStyle(document.querySelector(".button"));
    return { sheetBg: sheet.backgroundColor, btnBg: btn.backgroundColor, btnBorder: btn.borderColor };
  });
  console.log("forced-colors computed:", JSON.stringify(cs));
  await page.screenshot({ path: "evidence/home-forced-colors.png" });
  await page.close();
}

// How many project pages carry body images?
import { readFileSync, readdirSync } from "node:fs";
let withImages = 0, totalImgs = 0;
for (const f of readdirSync("../../rebuild/src/content/projects")) {
  const raw = readFileSync(`../../rebuild/src/content/projects/${f}`, "utf8");
  const n = [...raw.matchAll(/- src: \/images\//g)].length;
  if (n > 0) withImages++;
  totalImgs += n;
}
console.log(`project pages with body images: ${withImages}/18, body images total: ${totalImgs}`);

await browser.close();
