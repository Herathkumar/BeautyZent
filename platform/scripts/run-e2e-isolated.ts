/**
 * Full Playwright suite against a throwaway local Postgres (not Neon/live).
 *
 * Usage:
 *   pnpm test:e2e:isolated
 *   pnpm test:e2e:isolated -- --headed
 */
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { config as loadEnv } from "dotenv";
import EmbeddedPostgres from "embedded-postgres";

const platformRoot = path.resolve(__dirname, "..");
loadEnv({ path: path.join(platformRoot, ".env") });

const PORT = Number(process.env.E2E_PG_PORT || 55432);
const PASSWORD = "e2e_local_only";
const DATA_DIR = path.join(platformRoot, ".e2e-pg-data");
const DATABASE_URL = `postgresql://postgres:${PASSWORD}@127.0.0.1:${PORT}/postgres`;

function run(cmd: string, args: string[], env: NodeJS.ProcessEnv) {
  return new Promise<number>((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: platformRoot,
      env,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function main() {
  const extraArgs = process.argv.slice(2).filter((a) => a !== "--");
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: "postgres",
    password: PASSWORD,
    port: PORT,
    persistent: false,
  });

  console.log(`Starting isolated Postgres on 127.0.0.1:${PORT} …`);
  await pg.initialise();
  await pg.start();
  console.log("Isolated DB ready (live Neon is not used).");

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL,
    E2E_DATABASE_URL: DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET || "e2e-auth-secret-not-for-production",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    NEXT_PUBLIC_DEFAULT_SALON_SLUG: "fhsalon",
    E2E_ADMIN_PASSWORD: "demo1234",
    PLAYWRIGHT_BROWSERS_PATH:
      process.env.PLAYWRIGHT_BROWSERS_PATH ||
      path.join(process.env.USERPROFILE || "", "AppData", "Local", "ms-playwright"),
    CI: process.env.CI || "",
  };

  try {
    console.log("Pushing schema + seeding demo data …");
    const pushCode = await run("pnpm", ["exec", "prisma", "db", "push", "--skip-generate", "--accept-data-loss"], env);
    if (pushCode !== 0) throw new Error(`prisma db push failed (${pushCode})`);

    const seedCode = await run("pnpm", ["db:seed"], env);
    if (seedCode !== 0) throw new Error(`db:seed failed (${seedCode})`);

    console.log("Running Playwright suite …");
    const testCode = await run(
      "pnpm",
      ["exec", "playwright", "test", ...extraArgs],
      env
    );

    console.log("");
    console.log(`Playwright finished with exit code ${testCode}`);
    console.log("HTML report: platform/playwright-report/index.html");
    console.log("Open with: pnpm test:e2e:report");

    process.exitCode = testCode;
  } finally {
    console.log("Stopping isolated Postgres …");
    try {
      await pg.stop();
    } catch (e) {
      console.warn("Postgres stop warning:", e);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
