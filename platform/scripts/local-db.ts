/**
 * Docker-free local Postgres for multi-salon dev (same URL as docker-compose.yml).
 *
 * Usage:
 *   pnpm db:local:up      # keeps running until Ctrl+C — leave this terminal open
 *   pnpm db:local:up -- --reset
 */
import fs from "fs";
import path from "path";
import EmbeddedPostgres from "embedded-postgres";

const platformRoot = path.resolve(__dirname, "..");
const DATA_DIR = path.join(platformRoot, ".local-pg-data");
const PORT = Number(process.env.LOCAL_PG_PORT || 55433);
const USER = "salonbook";
const PASSWORD = "salonbook";
const DB_NAME = "salonbook";
const URL = `postgresql://${USER}:${PASSWORD}@127.0.0.1:${PORT}/${DB_NAME}`;

async function main() {
  const reset = process.argv.includes("--reset");
  if (reset && fs.existsSync(DATA_DIR)) {
    console.log("Wiping .local-pg-data (--reset) …");
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
    console.log("Initialising a fresh local cluster …");
    await pg.initialise();
  }

  await pg.start();
  if (isNew) await pg.createDatabase(DB_NAME);

  console.log("");
  console.log("Local Postgres is up.");
  console.log(`  DATABASE_URL="${URL}"`);
  console.log("");
  console.log("Next (in another terminal): pnpm db:local:setup && pnpm dev:local");
  console.log("Leave this window open. Ctrl+C stops the database.");

  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    console.log("\nStopping local Postgres …");
    try {
      await pg.stop();
    } catch (e) {
      console.warn("Postgres stop warning:", e);
    }
    process.exit(0);
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  // Hold the process open so the server stays alive with this terminal.
  setInterval(() => {}, 1 << 30);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
