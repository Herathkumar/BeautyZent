import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");
const svg = fs.readFileSync(path.join(publicDir, "book-icon.svg"), "utf8");
const jobs = [
  { png: "book-icon-180.png", size: 180 },
  { png: "book-icon-192.png", size: 192 },
  { png: "book-icon-512.png", size: 512 },
];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const job of jobs) {
  const html = `<!doctype html><html><body style="margin:0;background:#000">
    <div style="width:${job.size}px;height:${job.size}px">${svg.replace(
      "<svg",
      `<svg width="${job.size}" height="${job.size}"`
    )}</div></body></html>`;
  await page.setViewportSize({ width: job.size, height: job.size });
  await page.setContent(html, { waitUntil: "load" });
  const out = path.join(publicDir, job.png);
  await page.locator("div").first().screenshot({ path: out, omitBackground: false });
  console.log("wrote", out);
}

await browser.close();
