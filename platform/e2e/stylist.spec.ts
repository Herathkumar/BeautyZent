import { test, expect } from "@playwright/test";
import { stylistLogin } from "./helpers";

test.describe("Stylist phone portal", () => {
  test("login lands on FHSalon", async ({ page }) => {
    await stylistLogin(page);
    await expect(page.getByText(/hi,|today|fhsalon/i).first()).toBeVisible();
    await expect(page.getByTestId("stylist-home-photo")).toBeVisible();
    await expect(page.getByRole("link", { name: /add selfie for online booking|change booking photo/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^my jobs$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^schedule$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^earnings$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^profile$/i })).toBeVisible();
  });

  test("schedule page loads", async ({ page }) => {
    await stylistLogin(page);
    await page.getByRole("link", { name: /^schedule$/i }).click();
    await expect(page.getByRole("heading", { name: "Schedule" })).toBeVisible();
    await expect(page.getByTestId("schedule-week-ring")).toBeVisible();
    await expect(page.getByTestId("schedule-away-strip")).toBeVisible();
    await expect(page.getByRole("button", { name: /save work days/i })).toBeVisible();
  });

  test("account page loads for credential changes", async ({ page }) => {
    await stylistLogin(page);
    await page.getByRole("link", { name: /^profile$/i }).click();
    await expect(page.getByRole("heading", { name: /^profile$/i })).toBeVisible();
    await expect(page.getByTestId("stylist-profile-card")).toBeVisible();
    await expect(page.getByTestId("stylist-photo-preview")).toBeVisible();
    await expect(page.getByTestId("stylist-edit-profile")).toBeVisible();
    await expect(page.getByLabel(/current password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^log out$/i })).toBeVisible();
  });
});


