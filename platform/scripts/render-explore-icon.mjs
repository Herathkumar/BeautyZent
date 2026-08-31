import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");
const srcPath = path.join(publicDir, "brand", "beautyzent-explore-icon.png");
const srcDataUrl = `data:image/png;base64,${fs.readFileSync(srcPath).toString("base64")}`;
const jobs = [
  { png: "explore-icon-180.png", size: 180 },
  { png: "explore-icon-192.png", size: 192 },
  { png: "explore-icon-512.png", size: 512 },
];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(
  `<!doctype html><canvas id="c"></canvas><script>
  window.__go = (async () => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = ${JSON.stringify(srcDataUrl)}; });
    window.__img = img;
  })();
  </script>`,
  { waitUntil: "load" }
);
await page.evaluate(() => window.__go);

for (const job of jobs) {
  const dataUrl = await page.evaluate(({ size }) => {
    const img = window.__img;
    const c = document.getElementById("c");
    c.width = size; c.height = size;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#0a1a3a";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    return c.toDataURL("image/png");
  }, { size: job.size });
  const out = path.join(publicDir, job.png);
  fs.writeFileSync(out, Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ""), "base64"));
  console.log("wrote", out, fs.statSync(out).size);
}
await browser.close();
