import { test, expect } from "@playwright/test";
import { addManagerProduct, addManagerService, gotoSettled, managerLogin } from "./helpers";
import { TENANTS } from "./tenants";

test.describe("Manager catalog + pages", () => {
  for (const tenant of TENANTS) {
    test(`${tenant.slug} dashboard, bookings, working, walk-in, profile`, async ({ page }) => {
      await managerLogin(page, tenant);
      await expect(page.getByRole("link", { name: tenant.name })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole("link", { name: /^dashboard$/i }).first()).toBeVisible();
      await expect(page.getByTestId("dashboard-who-working")).toBeVisible();

      await gotoSettled(page, "/manager/appointments");
      await expect(page.getByRole("heading", { name: /^bookings$/i })).toBeVisible();

      await gotoSettled(page, "/manager/working");
      await expect(page.getByRole("heading", { name: /who.?s working/i })).toBeVisible();
      await expect(
        page.getByTestId("working-roster-row").filter({ hasText: tenant.stylistName }).first()
      ).toBeVisible({ timeout: 15_000 });

      await gotoSettled(page, "/manager/walk-in");
      await expect(page.getByRole("heading", { name: /^walk-in$/i })).toBeVisible();
      await expect(page.getByTestId("walk-in-panel")).toBeVisible();

      await gotoSettled(page, "/manager/book");
      await expect(page.getByRole("heading", { name: /book for a client/i })).toBeVisible();

      await gotoSettled(page, "/manager/stylists");
      await expect(page.getByRole("heading", { name: /stylist/i })).toBeVisible();
      await expect(
        page.locator("article").filter({ hasText: new RegExp(tenant.stylistName, "i") }).first()
      ).toBeVisible();

      await gotoSettled(page, "/manager/account");
      await expect(page.getByRole("heading", { name: /^profile$/i })).toBeVisible();
      await expect(page.getByText(tenant.managerEmail)).toBeVisible();
    });

    test(`${tenant.slug} can add a service without AI image`, async ({ page }) => {
      await managerLogin(page, tenant);
      await addManagerService(page, { name: `QA Svc ${tenant.id} ${Date.now()}` });
    });

    test(`${tenant.slug} can add a retail product`, async ({ page }) => {
      await managerLogin(page, tenant);
      await addManagerProduct(page, {
        name: `QA Prod ${tenant.id} ${Date.now()}`,
        sku: `${tenant.uniqueProduct}-${Date.now()}`,
      });
    });
  }
});
