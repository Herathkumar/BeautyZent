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

  test("account page loads and rejects wrong current password", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/account");
    await expect(page.getByRole("heading", { name: /change password/i })).toBeVisible();
    await expect(page.getByText(DEMO.adminEmail)).toBeVisible();

    await page.getByLabel(/^current password$/i).fill("wrong-current-password");
    await page.getByLabel(/^new password$/i).fill("NewPassword123!");
    await page.getByLabel(/confirm new password/i).fill("NewPassword123!");
    await page.getByRole("button", { name: /update password/i }).click();
    await expect(page.getByText(/current password is incorrect/i)).toBeVisible();
  });

  test("admin can change password and sign back in", async ({ page }) => {
    // Requires a working admin password in DEMO / E2E_ADMIN_PASSWORD.
    // Changes password then restores the original so other tests keep working.
    const original = DEMO.password;
    const tempPassword = `AdminTmp${Date.now().toString(36)}!`;

    await adminLogin(page);
    await page.goto("/admin/account");
    await page.getByLabel(/^current password$/i).fill(original);
    await page.getByLabel(/^new password$/i).fill(tempPassword);
    await page.getByLabel(/confirm new password/i).fill(tempPassword);
    await page.getByRole("button", { name: /update password/i }).click();
    await expect(page.getByText(/password updated/i)).toBeVisible();

    await page.getByRole("button", { name: /log out/i }).click();
    await page.goto("/admin/login");
    await page.getByLabel(/email/i).fill(DEMO.adminEmail);
    await page.getByLabel(/password/i).fill(tempPassword);
    await page.locator('form button[type="submit"]').click();
    await expect(page).toHaveURL(/\/admin(?!\/login)/, { timeout: 20_000 });

    await page.goto("/admin/account");
    await page.getByLabel(/^current password$/i).fill(tempPassword);
    await page.getByLabel(/^new password$/i).fill(original);
    await page.getByLabel(/confirm new password/i).fill(original);
    await page.getByRole("button", { name: /update password/i }).click();
    await expect(page.getByText(/password updated/i)).toBeVisible();
  });
});
