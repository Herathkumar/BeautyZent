/**
 * Writes theme packs to:
 *  - src/app/salon-themes.css  (imported by globals)
 *  - public/salon-themes.css   (linked raw — bypasses Tailwind processing)
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { allSalonThemesCss } from "../src/lib/salon-themes";

const targets = [
  join(process.cwd(), "src", "app", "salon-themes.css"),
  join(process.cwd(), "public", "salon-themes.css"),
];
const next = allSalonThemesCss();

for (const target of targets) {
  let current = "";
  try {
    current = readFileSync(target, "utf8");
  } catch {
    /* first run */
  }
  if (current === next) {
    console.log(`${target} already up to date`);
  } else {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, next, "utf8");
    console.log(`${target} written (${next.split("\n").length} lines)`);
  }
}
