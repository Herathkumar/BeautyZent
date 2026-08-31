/**
 * Renders full-bleed PNG home-screen icons from SVG (iOS needs PNG apple-touch-icon).
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");

const jobs = [
  { svg: "manager-icon.svg", png: "manager-icon-180.png", size: 180 },
  { svg: "manager-icon.svg", png: "manager-icon-192.png", size: 192 },
  { svg: "manager-icon.svg", png: "manager-icon-512.png", size: 512 },
  { svg: "stylist-icon.svg", png: "stylist-icon-180.png", size: 180 },
  { svg: "stylist-icon.svg", png: "stylist-icon-192.png", size: 192 },
  { svg: "stylist-icon.svg", png: "stylist-icon-512.png", size: 512 },
  { svg: "display-icon.svg", png: "display-icon-180.png", size: 180 },
  { svg: "display-icon.svg", png: "display-icon-192.png", size: 192 },
  { svg: "display-icon.svg", png: "display-icon-512.png", size: 512 },
  // Client book icons come from brand/beautyzent-client-icon.jpg via render-book-icon.mjs
];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const job of jobs) {
  const svgPath = path.join(publicDir, job.svg);
  const svg = fs.readFileSync(svgPath, "utf8");
  const html = `<!doctype html><html><body style="margin:0;background:#000">
    <div style="width:${job.size}px;height:${job.size}px">${svg.replace(
      '<svg',
      `<svg width="${job.size}" height="${job.size}"`
    )}</div></body></html>`;
  await page.setViewportSize({ width: job.size, height: job.size });
  await page.setContent(html, { waitUntil: "load" });
  const out = path.join(publicDir, job.png);
  await page.locator("div").first().screenshot({ path: out, omitBackground: false });
  console.log("wrote", out);
}

await browser.close();
