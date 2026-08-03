import { test, expect } from "@playwright/test";
import { stylistLogin } from "./helpers";

test.describe("Stylist phone portal", () => {
  test("login lands on My Day", async ({ page }) => {
    await stylistLogin(page);
    await expect(page.getByText(/hi,|today|my day/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^today$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^away$/i })).toBeVisible();
  });

  test("away & hours page loads", async ({ page }) => {
    await stylistLogin(page);
    await page.getByRole("link", { name: /^away$/i }).click();
    await expect(page.getByRole("heading", { name: "Away & hours" })).toBeVisible();
    await expect(page.getByRole("button", { name: /mark me away|save work days/i }).first()).toBeVisible();
  });
});
