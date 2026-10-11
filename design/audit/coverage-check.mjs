import { chromium } from "playwright-core";
import { PNG } from "pngjs";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto("http://127.0.0.1:4321/", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.evaluate(() => (document.querySelector("main").style.visibility = "hidden"));
for (let i = 0; i < 6; i++) {
  const a = PNG.sync.read(await page.locator(".sheet").screenshot({ animations: "allow" }));
  const b = PNG.sync.read(await page.locator(".sheet").screenshot());
  const frac = (png) => {
    let dark = 0;
    for (let j = 0; j < png.data.length; j += 4) {
      if (0.2126 * png.data[j] + 0.7152 * png.data[j + 1] + 0.0722 * png.data[j + 2] < 128) dark++;
    }
    return (100 * dark / (png.width * png.height)).toFixed(3);
  };
  console.log(`sample ${i}: allow=${frac(a)}% default=${frac(b)}%  (${a.width}x${a.height})`);
  await page.waitForTimeout(1000);
}
await browser.close();
