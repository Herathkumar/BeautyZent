/**
 * Runs a command against the LOCAL dev database only.
 *
 * Env precedence: .env  <  .env.local  <  LOCAL_DATABASE_URL
 * Refuses to run when the resolved URL looks like a hosted/production database,
 * so `db:local:*` can never push or seed over Neon.
 *
 * Usage: tsx scripts/with-local-env.ts prisma db push
 */
import path from "path";
import { spawn } from "child_process";
import { config as loadEnv } from "dotenv";

const platformRoot = path.resolve(__dirname, "..");
const DEFAULT_URL = "postgresql://salonbook:salonbook@127.0.0.1:55433/salonbook";

loadEnv({ path: path.join(platformRoot, ".env") });
loadEnv({ path: path.join(platformRoot, ".env.local"), override: true });

const url = process.env.LOCAL_DATABASE_URL || process.env.DATABASE_URL || DEFAULT_URL;
const host = (() => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
})();
const isLocalHost = ["localhost", "127.0.0.1", "::1", "host.docker.internal"].includes(host);

if (!isLocalHost) {
  console.error(
    [
      `Refusing to run against non-local database host "${host || url}".`,
      "",
      "Create platform/.env.local (copy .env.local.example) with:",
      `  DATABASE_URL="${DEFAULT_URL}"`,
    ].join("\n")
  );
  process.exit(1);
}

const args = process.argv.slice(2).filter((a) => a !== "--");
if (args.length === 0) {
  console.error("Usage: tsx scripts/with-local-env.ts <command> [...args]");
  process.exit(1);
}

// On Windows spawn joins args for cmd.exe — quote anything with spaces/pipes.
const spawnArgs =
  process.platform === "win32"
    ? ["exec", ...args].map((a) => (/[\s|&<>^%]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a))
    : ["exec", ...args];

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
