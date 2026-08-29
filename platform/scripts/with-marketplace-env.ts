/**
 * Runs a command against the MARKETPLACE local database only (port 55434 / beautyzent).
 * Never loads .env.local (multi-salon) — keeps salonbook on 55433 untouched.
 *
 * Env: .env (non-DB secrets) < .env.marketplace < MARKETPLACE_DATABASE_URL
 *
 * Usage: tsx scripts/with-marketplace-env.ts prisma db push
 */
import path from "path";
import { spawn } from "child_process";
import { config as loadEnv } from "dotenv";

const platformRoot = path.resolve(__dirname, "..");
const DEFAULT_URL =
  "postgresql://beautyzent:beautyzent@127.0.0.1:55434/beautyzent";

loadEnv({ path: path.join(platformRoot, ".env") });
loadEnv({ path: path.join(platformRoot, ".env.marketplace"), override: true });

const url =
  process.env.MARKETPLACE_DATABASE_URL || process.env.DATABASE_URL || DEFAULT_URL;

let parsed: URL;
try {
  parsed = new URL(url);
} catch {
  console.error(`Invalid marketplace DATABASE_URL: ${url}`);
  process.exit(1);
}

const host = parsed.hostname;
const port = parsed.port || "5432";
const dbName = parsed.pathname.replace(/^\//, "").split("?")[0];
const isLocalHost = ["localhost", "127.0.0.1", "::1", "host.docker.internal"].includes(
  host
);

if (!isLocalHost) {
  console.error(
    [
      `Refusing marketplace command against non-local host "${host}".`,
      `Expected local BeautyZent DB, e.g.:`,
      `  DATABASE_URL="${DEFAULT_URL}"`,
    ].join("\n")
  );
  process.exit(1);
}

// Guardrails: never hit the multi-salon docker (55433/salonbook) from marketplace scripts.
if (port === "55433" || dbName === "salonbook") {
  console.error(
    [
      "Refusing to run marketplace scripts against the multi-salon database.",
      `Resolved URL looks like salonbook (${host}:${port}/${dbName}).`,
      "",
      "Use platform/.env.marketplace with:",
      `  DATABASE_URL="${DEFAULT_URL}"`,
      "",
      "Multi-salon stays on: postgresql://salonbook:salonbook@127.0.0.1:55433/salonbook",
    ].join("\n")
  );
  process.exit(1);
}

if (port !== "55434" || dbName !== "beautyzent") {
  console.warn(
    `Warning: marketplace URL is ${host}:${port}/${dbName} (expected 55434/beautyzent). Continuing.`
  );
}

const args = process.argv.slice(2).filter((a) => a !== "--");
if (args.length === 0) {
  console.error("Usage: tsx scripts/with-marketplace-env.ts <command> [...args]");
  process.exit(1);
}

const spawnArgs =
  process.platform === "win32"
    ? ["exec", ...args].map((a) => (/[\s|&<>^%]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a))
    : ["exec", ...args];

console.log(`→ marketplace DB: ${host}:${port}/${dbName}`);

const child = spawn("pnpm", spawnArgs, {
  cwd: platformRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, DATABASE_URL: url },
});

child.on("error", (err) => {
  console.error(err);
  process.exit(1);
});
child.on("exit", (code) => process.exit(code ?? 1));
