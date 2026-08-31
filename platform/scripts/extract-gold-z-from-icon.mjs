/**
 * Extract the metallic gold Z from the client icon onto a transparent PNG.
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");
const srcPath = path.join(publicDir, "brand", "beautyzent-client-icon.png");
const outPath = path.join(publicDir, "brand", "beautyzent-logo-gold-mark.png");
const srcDataUrl = `data:image/png;base64,${fs.readFileSync(srcPath).toString("base64")}`;

const browser = await chromium.launch();
const page = await browser.newPage();

const meta = await page.evaluate(async (srcDataUrl) => {
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = srcDataUrl;
  });
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const image = ctx.getImageData(0, 0, w, h);
  const d = image.data;

  // Gold vs navy plate: gold is warm + bright; navy is blue-dominant + darker.
  const goldScore = (i) => {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const warm = (r + g) / 2 - b;
    const yellowBias = Math.min(r, g) - b;
    // Strong gold / highlight
    let s = 0;
    if (warm > 28 && lum > 55 && r > 90) s = Math.min(1, (warm - 20) / 90 + (lum - 50) / 160);
    if (yellowBias > 20 && lum > 70) s = Math.max(s, Math.min(1, yellowBias / 80));
    // Soft shadow bronze still part of the letter
    if (r > 70 && g > 45 && b < 90 && warm > 18 && lum > 40) s = Math.max(s, 0.55);
    // Bright specular
    if (lum > 200 && r > 180 && g > 150) s = 1;
    // Reject navy plate
    if (b > r + 15 && b > g + 10 && lum < 120) s = 0;
    if (lum < 28 && warm < 25) s = 0;
    return Math.max(0, Math.min(1, s));
  };

  const alpha = new Float32Array(w * h);
  for (let p = 0, i = 0; p < w * h; p++, i += 4) alpha[p] = goldScore(i);

  // Mild dilate then erode to close tiny holes in metal, then keep soft edge
  const tmp = new Float32Array(w * h);
  const dilate = (src, dst) => {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        dst[p] = Math.max(src[p], src[p - 1], src[p + 1], src[p - w], src[p + w]);
      }
    }
  };
  const erode = (src, dst) => {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        dst[p] = Math.min(src[p], src[p - 1], src[p + 1], src[p - w], src[p + w]);
      }
    }
  };
  dilate(alpha, tmp);
  erode(tmp, alpha);

  // Keep largest component (the Z)
  const keep = new Uint8Array(w * h);
  const cx = (w / 2) | 0, cy = (h / 2) | 0;
  let seed = -1;
  for (let r = 0; r < Math.min(w, h) / 2 && seed < 0; r++) {
    for (let dy = -r; dy <= r && seed < 0; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const p = y * w + x;
        if (alpha[p] > 0.35) { seed = p; break; }
      }
    }
  }
  if (seed < 0) throw new Error("no gold pixels found");
  const q = [seed];
  keep[seed] = 1;
  for (let qi = 0; qi < q.length; qi++) {
    const p = q[qi];
    const x = p % w;
    const y = (p - x) / w;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const n = ny * w + nx;
      if (keep[n] || alpha[n] < 0.2) continue;
      keep[n] = 1;
      q.push(n);
    }
  }

  let minX = w, minY = h, maxX = 0, maxY = 0, count = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const a = keep[p] ? alpha[p] : 0;
      const i = p * 4;
      d[i + 3] = Math.round(a * 255);
      if (a > 0.15) {
        count++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  ctx.putImageData(image, 0, 0);

  // Pad to square with transparent margin for spin
  const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.06);
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const side = Math.max(bw, bh);
  const out = document.createElement("canvas");
  out.width = side;
  out.height = side;
  const octx = out.getContext("2d");
  const ox = Math.floor((side - bw) / 2);
  const oy = Math.floor((side - bh) / 2);
  octx.clearRect(0, 0, side, side);
  octx.drawImage(c, minX, minY, bw, bh, ox, oy, bw, bh);

  return {
    dataUrl: out.toDataURL("image/png"),
    side,
    count,
    box: { minX, minY, maxX, maxY },
  };
}, srcDataUrl);

fs.writeFileSync(outPath, Buffer.from(meta.dataUrl.replace(/^data:image\/png;base64,/, ""), "base64"));
console.log("wrote", outPath, fs.statSync(outPath).size, meta);
await browser.close();
