import { test, expect } from "@playwright/test";
import { stylistLogin } from "./helpers";
import { TENANTS } from "./tenants";

test.describe("Stylist app", () => {
  for (const tenant of TENANTS) {
    test(`${tenant.slug} home, schedule, earnings, profile`, async ({ page }) => {
      await stylistLogin(page, tenant);
      await expect(page.getByText(/hi,/i).first()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole("link", { name: tenant.name })).toBeVisible();

      await page.getByRole("link", { name: /^schedule$/i }).click();
      await expect(page).toHaveURL(/\/stylist\/schedule/);
      await expect(page.getByRole("heading", { name: /^schedule$/i })).toBeVisible({
        timeout: 15_000,
      });

      await page.getByRole("link", { name: /^earnings$/i }).click();
      await expect(page.getByRole("heading", { name: /^earnings$/i })).toBeVisible();
      await expect(page.getByText(/week total|your pay plan/i).first()).toBeVisible();

      await page.goto("/stylist/account");
      await expect(page.getByText(tenant.stylistEmail).first()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId("stylist-logout")).toBeVisible();
    });
  }
});
