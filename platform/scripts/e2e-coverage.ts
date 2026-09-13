/**
 * Static E2E coverage inventory for BeautyZent / SalonBook.
 * Run before the suite so reviewers see what is covered (and what is not).
 *
 * Usage:
 *   pnpm test:e2e:coverage
 *   pnpm test:e2e:coverage -- --json
 */
import fs from "fs";
import path from "path";

type Status = "covered" | "partial" | "gap" | "out_of_scope";

type Feature = {
  area: string;
  feature: string;
  status: Status;
  specs: string[];
  notes?: string;
};

const FEATURES: Feature[] = [
  // Public / marketplace
  {
    area: "Landing",
    feature: "Home / BeautyZent landing CTAs",
    status: "covered",
    specs: ["smoke.spec.ts"],
  },
  {
    area: "Explore",
    feature: "Directory search, filters, sort, rewards",
    status: "covered",
    specs: ["explore-discovery.spec.ts"],
  },
  {
    area: "Explore",
    feature: "Business detail page + Book CTA + deep link",
    status: "covered",
    specs: ["explore-business.spec.ts"],
  },
  {
    area: "Explore",
    feature: "Favorite business from explore detail (signed-in)",
    status: "covered",
    specs: ["explore-business.spec.ts", "consumer-account.spec.ts"],
  },
  {
    area: "Claim",
    feature: "Self-serve claim → DRAFT listing",
    status: "covered",
    specs: ["marketplace-lifecycle.spec.ts"],
  },
  {
    area: "Platform",
    feature: "Approve / reject / pause marketplace listing",
    status: "covered",
    specs: ["marketplace-lifecycle.spec.ts"],
  },
  {
    area: "Platform",
    feature: "Console lists tenants + configure smoke",
    status: "covered",
    specs: ["multi-salon/platform-console.spec.ts"],
  },
  {
    area: "Platform",
    feature: "Create salon submit + manager can log in",
    status: "partial",
    specs: ["multi-salon/platform-console.spec.ts"],
    notes: "Form load covered; full create+login not asserted",
  },
  {
    area: "Account",
    feature: "Consumer OTP account API (profile, favorites, cancel/reschedule)",
    status: "covered",
    specs: ["consumer-account.spec.ts"],
  },
  {
    area: "Account",
    feature: "Consumer account UI sign-in + tabs",
    status: "covered",
    specs: ["consumer-account-ui.spec.ts"],
  },
  {
    area: "Account",
    feature: "Multi-salon switch across memberships",
    status: "gap",
    specs: [],
    notes: "API exists; no dedicated e2e yet",
  },

  // Booking
  {
    area: "Booking",
    feature: "Guest booking wizard end-to-end",
    status: "covered",
    specs: ["booking.spec.ts", "guest-booking-visibility.spec.ts"],
  },
  {
    area: "Booking",
    feature: "Member join / OTP / look book / BeautyAI tabs",
    status: "covered",
    specs: ["member-auth.spec.ts", "look-book.spec.ts", "client-profile.spec.ts"],
  },
  {
    area: "Booking",
    feature: "Booking edges (confirmation, stepper)",
    status: "covered",
    specs: ["booking-edges.spec.ts"],
  },
  {
    area: "Booking",
    feature: "Style preview AI generate",
    status: "gap",
    specs: [],
    notes: "Depends on AI provider; skipped in suite",
  },
  {
    area: "Booking",
    feature: "Day path: book → display → stylist Done → admin",
    status: "covered",
    specs: ["salon-day.spec.ts"],
  },

  // Auth
  {
    area: "Auth",
    feature: "Manager/stylist guards, bad password, role routing, logout",
    status: "covered",
    specs: ["auth.spec.ts"],
  },
  {
    area: "Auth",
    feature: "Dedicated FRONT_DESK role flows",
    status: "partial",
    specs: ["reception-auth.spec.ts"],
    notes: "Reception uses manager creds in helpers",
  },

  // Manager
  {
    area: "Manager",
    feature: "Login, dashboard, services, book-for-client",
    status: "covered",
    specs: ["admin.spec.ts", "admin-book.spec.ts"],
  },
  {
    area: "Manager",
    feature: "Appointments filters + no-show",
    status: "covered",
    specs: ["admin-bookings-filter.spec.ts"],
  },
  {
    area: "Manager",
    feature: "Promotions + payroll + store earnings",
    status: "covered",
    specs: ["admin-promotions.spec.ts", "admin-pay.spec.ts", "admin-store-earnings.spec.ts"],
  },
  {
    area: "Manager",
    feature: "Walk-in / waitlist / dashboard summary",
    status: "covered",
    specs: ["walk-in.spec.ts", "dashboard-summary.spec.ts"],
  },
  {
    area: "Manager",
    feature: "Stylist accounts, photo, manage schedule page",
    status: "covered",
    specs: [
      "stylist-accounts.spec.ts",
      "manager-photo.spec.ts",
      "manager-stylist-schedule.spec.ts",
    ],
  },
  {
    area: "Manager",
    feature: "Mark payroll payout paid / earnings goal edit",
    status: "partial",
    specs: ["admin-pay.spec.ts", "admin-store-earnings.spec.ts"],
    notes: "Page load / UI smoke; payout mark thin",
  },

  // Stylist
  {
    area: "Stylist",
    feature: "Login, floor board, schedule, earnings, photo",
    status: "covered",
    specs: [
      "stylist.spec.ts",
      "stylist-schedule.spec.ts",
      "stylist-earnings.spec.ts",
      "stylist-photo.spec.ts",
    ],
  },

  // Displays / reception
  {
    area: "Displays",
    feature: "Lounge / scheduler / reception surfaces",
    status: "covered",
    specs: ["smoke.spec.ts", "reception-auth.spec.ts", "multi-salon/public-apps.spec.ts"],
  },
  {
    area: "Displays",
    feature: "Display root redirect + PIN unlock",
    status: "covered",
    specs: ["display-redirect.spec.ts", "display-pin.spec.ts"],
  },
  {
    area: "Displays",
    feature: "Checkout promotions / loyalty auto-discount",
    status: "covered",
    specs: ["checkout-promotions.spec.ts"],
  },
  {
    area: "Displays",
    feature: "Retail product lines on checkout bill",
    status: "gap",
    specs: [],
  },

  // Multi-salon
  {
    area: "Multi-salon",
    feature: "Tenant isolation, catalog, stylist, earnings lifecycle",
    status: "covered",
    specs: [
      "multi-salon/tenant-isolation.spec.ts",
      "multi-salon/manager-catalog.spec.ts",
      "multi-salon/stylist-app.spec.ts",
      "multi-salon/earnings-lifecycle.spec.ts",
      "multi-salon/public-apps.spec.ts",
    ],
  },

  // Mobile / demo
  {
    area: "Mobile",
    feature: "iPhone viewport book + staff nav + demo hub",
    status: "covered",
    specs: ["mobile.spec.ts", "smoke.spec.ts"],
  },

  // Explicitly out of scope
  {
    area: "Integrations",
    feature: "Google Calendar OAuth / ICS",
    status: "out_of_scope",
    specs: [],
    notes: "Optional integration; not in local e2e",
  },
  {
    area: "Payments",
    feature: "Card / payment processor",
    status: "out_of_scope",
    specs: [],
    notes: "In-salon checkout only (no PSP)",
  },
  {
    area: "Marketing",
    feature: "Netlify static marketing HTML",
    status: "out_of_scope",
    specs: [],
  },
];

const STATUS_LABEL: Record<Status, string> = {
  covered: "COVERED",
  partial: "PARTIAL",
  gap: "GAP",
  out_of_scope: "OUT OF SCOPE",
};

function discoverSpecs(e2eRoot: string): string[] {
  const out: string[] = [];
  function walk(dir: string, prefix = "") {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, rel);
      else if (entry.name.endsWith(".spec.ts")) out.push(rel);
    }
  }
  walk(e2eRoot);
  return out.sort();
}

function countTests(e2eRoot: string, specs: string[]): number {
  let total = 0;
  for (const spec of specs) {
    const text = fs.readFileSync(path.join(e2eRoot, spec), "utf8");
    // Count Playwright test(...) calls, ignore commented lines
    const matches = text.match(/^\s*test(?:\.(?:only|skip|fix))?[\s\n]*\(/gm);
    total += matches?.length ?? 0;
  }
  return total;
}

function main() {
  const platformRoot = path.resolve(__dirname, "..");
  const e2eRoot = path.join(platformRoot, "e2e");
  const specs = discoverSpecs(e2eRoot);
  const testCount = countTests(e2eRoot, specs);

  const covered = FEATURES.filter((f) => f.status === "covered").length;
  const partial = FEATURES.filter((f) => f.status === "partial").length;
  const gaps = FEATURES.filter((f) => f.status === "gap").length;
  const outOfScope = FEATURES.filter((f) => f.status === "out_of_scope").length;
  const inScope = covered + partial + gaps;
  const pct = inScope ? Math.round(((covered + partial * 0.5) / inScope) * 100) : 0;

  const asJson = process.argv.includes("--json");
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      specFiles: specs.length,
      estimatedTests: testCount,
      featuresTracked: FEATURES.length,
      covered,
      partial,
      gaps,
      outOfScope,
      weightedCoveragePercent: pct,
    },
    specs,
    features: FEATURES,
  };

  const outDir = path.join(platformRoot, "playwright-report");
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "coverage-inventory.json");
  const mdPath = path.join(e2eRoot, "COVERAGE.md");

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const mdLines = [
    "# BeautyZent E2E coverage inventory",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `| Metric | Value |`,
    `| --- | --- |`,
    `| Spec files | ${specs.length} |`,
    `| Estimated tests | ${testCount} |`,
    `| Features tracked | ${FEATURES.length} |`,
    `| Covered | ${covered} |`,
    `| Partial | ${partial} |`,
    `| Gaps | ${gaps} |`,
    `| Out of scope | ${outOfScope} |`,
    `| Weighted coverage | **${pct}%** |`,
    "",
    "## Feature matrix",
    "",
    `| Area | Feature | Status | Specs | Notes |`,
    `| --- | --- | --- | --- | --- |`,
    ...FEATURES.map(
      (f) =>
        `| ${f.area} | ${f.feature} | ${STATUS_LABEL[f.status]} | ${
          f.specs.join(", ") || "—"
        } | ${f.notes || ""} |`
    ),
    "",
    "## Spec files",
    "",
    ...specs.map((s) => `- \`${s}\``),
    "",
  ];
  fs.writeFileSync(mdPath, mdLines.join("\n"));

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log("");
  console.log("════════════════════════════════════════════════════════════");
  console.log("  BeautyZent / SalonBook — E2E coverage inventory (pre-run)");
  console.log("════════════════════════════════════════════════════════════");
  console.log(`  Spec files:          ${specs.length}`);
  console.log(`  Estimated tests:     ${testCount}`);
  console.log(`  Features tracked:    ${FEATURES.length}`);
  console.log(`  Covered:             ${covered}`);
  console.log(`  Partial:             ${partial}`);
  console.log(`  Gaps:                ${gaps}`);
  console.log(`  Out of scope:        ${outOfScope}`);
  console.log(`  Weighted coverage:   ${pct}%`);
  console.log("────────────────────────────────────────────────────────────");
  for (const f of FEATURES) {
    const mark =
      f.status === "covered"
        ? "✓"
        : f.status === "partial"
          ? "~"
          : f.status === "gap"
            ? "✗"
            : "·";
    console.log(
      `  ${mark} [${STATUS_LABEL[f.status].padEnd(12)}] ${f.area} — ${f.feature}`
    );
  }
  console.log("────────────────────────────────────────────────────────────");
  console.log(`  Markdown: ${path.relative(platformRoot, mdPath)}`);
  console.log(`  JSON:     ${path.relative(platformRoot, jsonPath)}`);
  console.log("════════════════════════════════════════════════════════════");
  console.log("");
}

main();
