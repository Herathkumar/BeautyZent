import { test, expect } from "@playwright/test";
import { DEMO, stylistLogin } from "./helpers";

test.describe("Auth guards", () => {
  test("manager pages redirect to login when logged out", async ({ page }) => {
    await page.goto("/manager/services");
    await expect(page).toHaveURL(/\/manager\/login/, { timeout: 15_000 });
  });

  test("stylist pages redirect to login when logged out", async ({ page }) => {
    await page.goto("/stylist");
    await expect(page).toHaveURL(/\/stylist\/login/, { timeout: 15_000 });
  });

  test("stylist login with bad password fails", async ({ page }) => {
    await page.goto("/stylist/login");
    await page.getByLabel(/email/i).fill(DEMO.stylistEmail);
    await page.getByLabel(/password/i).fill("not-the-password");
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText(/invalid|failed|error/i)).toBeVisible();
  });

  test("admin credentials on stylist login go to manager", async ({ page }) => {
    await page.goto("/stylist/login");
    await page.getByLabel(/email/i).fill(DEMO.adminEmail);
    await page.getByLabel(/password/i).fill(DEMO.password);
    await page.locator('form button[type="submit"]').click();
    await expect(page).toHaveURL(/\/manager/, { timeout: 20_000 });
  });

  test("stylist can log out", async ({ page }) => {
    await stylistLogin(page);
    await page.goto("/stylist/account");
    await page.getByTestId("stylist-logout").click();
    await expect(page).toHaveURL(/\/stylist\/login/, { timeout: 15_000 });
  });

  test("/admin bookmarks redirect to /manager", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page).toHaveURL(/\/manager\/login/, { timeout: 15_000 });
  });
});
