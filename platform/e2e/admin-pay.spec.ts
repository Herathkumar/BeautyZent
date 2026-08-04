import { test, expect } from "@playwright/test";
import { adminLogin } from "./helpers";

test.describe("Admin pay & hours", () => {
  test("pay page loads filters and reports", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/pay");
    await expect(page.getByRole("heading", { name: /pay & hours/i })).toBeVisible();
    await expect(page.getByRole("combobox", { name: /^year$/i })).toBeVisible();
    await expect(page.getByRole("combobox", { name: /^month$/i })).toBeVisible();
    await expect(page.getByText(/estimated pay|no completed jobs/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("salon menu includes pay & hours", async ({ page }) => {
    await adminLogin(page);
    await page.locator(".admin-header-nav").getByRole("button", { name: /salon/i }).click();
    await page.getByRole("menuitem", { name: /pay & hours/i }).click();
    await expect(page).toHaveURL(/\/admin\/pay/);
  });
});
