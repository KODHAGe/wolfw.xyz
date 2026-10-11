import { chromium } from "playwright-core";
import { PNG } from "pngjs";
const BASE = "http://127.0.0.1:4321";

const browser = await chromium.launch({ channel: "chrome", headless: true });

// 1 — reverse direction: load WITH reduce, then turn it OFF. Does the field start?
{
  const page = await browser.newPage({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const a = PNG.sync.read(await page.locator(".sheet").screenshot());
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForTimeout(1500);
  const b = PNG.sync.read(await page.locator(".sheet").screenshot());
  let diff = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    if (Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 3] - b.data[i + 3]) > 12) diff++;
  }
  console.log(`reverse-toggle diff: ${(100 * diff / (a.width * a.height)).toFixed(3)}% pixels changed 1.5s after reduce was turned OFF (0 = loop never restarted)`);
  await page.close();
}

// 2 — coverage over time: is the t=0 frame denser than the animated steady state?
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const samples = [];
  for (let i = 0; i < 10; i++) {
    const png = PNG.sync.read(await page.locator(".sheet").screenshot());
    let dark = 0;
    for (let j = 0; j < png.data.length; j += 4) {
      if (0.2126 * png.data[j] + 0.7152 * png.data[j + 1] + 0.0722 * png.data[j + 2] < 128) dark++;
    }
    samples.push(+(100 * dark / (png.width * png.height)).toFixed(3));
    await page.waitForTimeout(700);
  }
  console.log("field coverage % over ~7s:", samples.join(", "));
  await page.close();
}

// 3 — is the password attribute in the DOM?
{
  const page = await browser.newPage();
  await page.goto(BASE + "/cv/", { waitUntil: "networkidle" });
  const pw = await page.evaluate(() => document.querySelector("[data-password]")?.getAttribute("data-password"));
  console.log(`data-password attribute in /cv DOM: ${JSON.stringify(pw)}`);
  await page.close();
}

// 4 — is Necto Mono actually loaded/usable?
{
  const page = await browser.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    return {
      check: document.fonts.check('16px "Necto Mono"'),
      loaded: [...document.fonts].map((f) => `${f.family} ${f.status}`),
      bodyFont: getComputedStyle(document.body).fontFamily,
    };
  });
  console.log("font check:", JSON.stringify(fonts));
  await page.close();
}

// 5 — project page image alt situation: what does the screen reader get?
{
  const page = await browser.newPage();
  await page.goto(BASE + "/kaekriaeinen/", { waitUntil: "networkidle" });
  const imgs = await page.evaluate(() => [...document.querySelectorAll("img")].map((i) => ({ src: i.getAttribute("src"), alt: i.alt, w: i.naturalWidth, h: i.naturalHeight, shown: Math.round(i.getBoundingClientRect().width) })));
  console.log("kaekriaeinen images:", JSON.stringify(imgs, null, 1));
  await page.close();
}

await browser.close();
