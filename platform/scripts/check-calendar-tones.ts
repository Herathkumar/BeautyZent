import { serviceKind } from "../src/lib/display-schedule";
import { appointmentCalendarTone } from "../src/lib/stylist-calendar-colors";

const cases: Array<[string, string]> = [
  ["Men's haircut", "cut"],
  ["Mens haircut", "cut"],
  ["Men's cut", "cut"],
  ["Haircut", "cut"],
  ["Women's haircut & style", "cut"],
  ["Fade / taper", "fade"],
  ["Beard tidy (with cut)", "fade"],
  ["Bridal Makeup Trial", "makeup"],
  ["Bridal hair", "style"],
  ["Balayage + Cut", "color"],
  ["Blowout", "style"],
];

let failed = 0;
for (const [name, expectTone] of cases) {
  const kind = serviceKind(name);
  const tone = appointmentCalendarTone({ serviceName: name, status: "BOOKED" }).id;
  const ok = tone === expectTone;
  if (!ok) failed += 1;
  console.log(`${ok ? "OK" : "FAIL"} ${JSON.stringify(name)} kind=${kind} tone=${tone} expected=${expectTone}`);
}
if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nAll passed");
