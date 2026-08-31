import { test, expect } from "@playwright/test";
import { DEMO } from "./helpers";

test.describe("Smoke — surfaces load", () => {
  test("home and demo hub", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /online booking/i })).toBeVisible();
    await page.getByRole("link", { name: /demo hub/i }).click();
    await expect(page.getByRole("heading", { name: /demo hub/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /book online/i }).first()).toBeVisible();
  });

  test("client booking page loads services", async ({ page }) => {
    await page.goto(`/book/${DEMO.slug}`);
    await expect(page.getByRole("heading", { name: /choose services?/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /haircut|trim|beard|fade/i }).first()).toBeVisible();
  });

  test("floor display loads", async ({ page }) => {
    await page.goto(`/display/${DEMO.slug}/lounge`);
    await expect(page.getByText(/farzana hair salon|salon floor|welcome/i).first()).toBeVisible();
  });
});
