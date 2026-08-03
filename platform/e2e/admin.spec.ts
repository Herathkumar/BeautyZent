import { test, expect } from "@playwright/test";
import { adminLogin, DEMO } from "./helpers";

test.describe("Admin portal", () => {
  test("login and see dashboard links", async ({ page }) => {
    await adminLogin(page);
    await expect(page.getByRole("link", { name: /services/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /stylists|bookings|book for client/i }).first()).toBeVisible();
  });

  test("services page lists items and sync control", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/services");
    await expect(page.getByRole("heading", { name: /services/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /link all services/i })).toBeVisible();
    await expect(page.getByText(/min/i).first()).toBeVisible();
  });

  test("book for client page loads catalog", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/book");
    await expect(page.getByText(/book|client|service|stylist/i).first()).toBeVisible();
  });

  test("rejects bad password", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel(/email/i).fill(DEMO.adminEmail);
    await page.getByLabel(/password/i).fill("wrong-password");
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText(/invalid|failed|error/i)).toBeVisible();
  });
});
