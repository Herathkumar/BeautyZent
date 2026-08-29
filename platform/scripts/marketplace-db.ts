/**
 * Docker-free local Postgres for BeautyZent marketplace
 * (same URL as docker-compose.marketplace.yml — does NOT touch salonbook).
 *
 * Usage:
 *   pnpm db:marketplace:up           # leave terminal open
 *   pnpm db:marketplace:up -- --reset
 */
import fs from "fs";
import path from "path";
import EmbeddedPostgres from "embedded-postgres";

const platformRoot = path.resolve(__dirname, "..");
const DATA_DIR = path.join(platformRoot, ".local-pg-marketplace-data");
const PORT = Number(process.env.MARKETPLACE_PG_PORT || 55434);
const USER = "beautyzent";
const PASSWORD = "beautyzent";
const DB_NAME = "beautyzent";
const URL = `postgresql://${USER}:${PASSWORD}@127.0.0.1:${PORT}/${DB_NAME}`;

async function main() {
  const reset = process.argv.includes("--reset");
  if (reset && fs.existsSync(DATA_DIR)) {
    console.log("Wiping .local-pg-marketplace-data (--reset) …");
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }

  const isNew = !fs.existsSync(path.join(DATA_DIR, "PG_VERSION"));
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: USER,
    password: PASSWORD,
    port: PORT,
    persistent: true,
  });

  if (isNew) {
    console.log("Initialising a fresh marketplace cluster …");
    await pg.initialise();
  }

  await pg.start();
  if (isNew) await pg.createDatabase(DB_NAME);

  console.log("");
  console.log("Marketplace Postgres is up (multi-salon DB untouched).");
  console.log(`  DATABASE_URL="${URL}"`);
  console.log("");
  console.log(
    "Next (another terminal): pnpm db:marketplace:setup && pnpm dev:marketplace"
  );
  console.log("Leave this window open. Ctrl+C stops the marketplace database.");

  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    console.log("\nStopping marketplace Postgres …");
    try {
      await pg.stop();
    } catch (e) {
      console.warn("Postgres stop warning:", e);
    }
    process.exit(0);
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  setInterval(() => {}, 1 << 30);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
