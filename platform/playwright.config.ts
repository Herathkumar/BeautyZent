import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { config as loadEnv } from "dotenv";

// Prefer isolated E2E DB URL when provided. Otherwise .env.local (local Postgres).
loadEnv({ path: path.join(__dirname, ".env") });
if (!process.env.E2E_DATABASE_URL) {
  loadEnv({ path: path.join(__dirname, ".env.local"), override: true });
}
if (process.env.E2E_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.E2E_DATABASE_URL;
}

const isolated = Boolean(process.env.E2E_DATABASE_URL);
const port = process.env.PLAYWRIGHT_PORT || (isolated ? "3333" : "3000");
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI || isolated ? 1 : 0,
  workers: 1,
  timeout: isolated ? 120_000 : 90_000,
  expect: { timeout: 15_000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["json", { outputFile: "playwright-report/results.json" }],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    // Turbopack often 404s the first request after compiling a new route in isolated e2e.
    command: isolated ? `pnpm exec next dev --port ${port}` : `pnpm dev --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI && !process.env.E2E_DATABASE_URL,
    timeout: 240_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || "",
      AUTH_SECRET: process.env.AUTH_SECRET || "e2e-auth-secret-not-for-production",
    },
  },
});
