import { test, expect } from "@playwright/test";
import { stylistLogin } from "./helpers";

test.describe("Stylist phone portal", () => {
  test("login lands on My Day", async ({ page }) => {
    await stylistLogin(page);
    await expect(page.getByText(/hi,|today|my day/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^today$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^away$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^account$/i })).toBeVisible();
  });

  test("away & hours page loads", async ({ page }) => {
    await stylistLogin(page);
    await page.getByRole("link", { name: /^away$/i }).click();
    await expect(page.getByRole("heading", { name: "Away & hours" })).toBeVisible();
    await expect(page.getByRole("button", { name: /mark me away|save work days/i }).first()).toBeVisible();
  });

  test("account page loads for credential changes", async ({ page }) => {
    await stylistLogin(page);
    await page.getByRole("link", { name: /^account$/i }).click();
    await expect(page.getByRole("heading", { name: /^account$/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /profile photo/i })).toBeVisible();
    await expect(page.getByTestId("stylist-photo-preview")).toBeVisible();
    await expect(page.getByLabel(/login email/i)).toBeVisible();
    await expect(page.getByLabel(/current password/i)).toBeVisible();
  });
});


