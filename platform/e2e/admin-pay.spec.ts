import { test, expect } from "@playwright/test";
import { adminLogin, gotoSettled } from "./helpers";

test.describe("Manager payroll", () => {
  test("pay page loads filters and reports", async ({ page }) => {
    await adminLogin(page);
    await gotoSettled(page, "/manager/pay");
    await expect(page.getByRole("heading", { name: /^payroll$/i })).toBeVisible();
    await expect(page.getByRole("combobox", { name: /^year$/i })).toBeVisible();
    await expect(page.getByRole("combobox", { name: /^month$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /download csv/i })).toBeVisible();
    await expect(page.getByText(/amount owed|no completed jobs|paid in full/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("money menu includes payroll", async ({ page }) => {
    await adminLogin(page);
    await page.locator(".admin-header-nav").getByRole("button", { name: /money/i }).click();
    await page.getByRole("menuitem", { name: /^payroll$/i }).click();
    await expect(page).toHaveURL(/\/manager\/pay/);
  });
});
