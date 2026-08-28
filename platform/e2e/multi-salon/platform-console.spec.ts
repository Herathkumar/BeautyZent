import { test, expect } from "@playwright/test";
import { platformLogin } from "./helpers";
import { TENANTS } from "./tenants";

test.describe("Platform operator console", () => {
  test("lists both seeded salons with counts and portal links", async ({ page }) => {
    await platformLogin(page);
    await expect(page.getByRole("heading", { name: /^salons$/i })).toBeVisible();
    await expect(page.getByText(/\d+ tenants? on this database/i)).toBeVisible();

    for (const tenant of TENANTS) {
      const card = page.locator("article").filter({ hasText: tenant.name });
      await expect(card).toBeVisible();
      await expect(card.getByText(`/${tenant.slug}`)).toBeVisible();
      await expect(card.getByText(/stylists/i)).toBeVisible();
      await expect(card.getByText(/services/i)).toBeVisible();
      await expect(card.getByRole("link", { name: /^configure$/i })).toBeVisible();
      await expect(card.getByRole("link", { name: /^book$/i })).toBeVisible();
      await expect(card.getByRole("link", { name: /^display$/i })).toBeVisible();
      await expect(card.getByRole("link", { name: /^reception$/i })).toBeVisible();
    }
  });

  test("salon detail shows staff logins and tenant-scoped portal URLs", async ({ page }) => {
    await platformLogin(page);

    for (const tenant of TENANTS) {
      const card = page.locator("article").filter({ hasText: tenant.name });
      await card.getByRole("link", { name: /^configure$/i }).click();
      await expect(page.getByRole("heading", { name: tenant.name })).toBeVisible();
      await expect(page.getByText(tenant.managerEmail)).toBeVisible();
      await expect(page.getByText(tenant.stylistEmail)).toBeVisible();
      await expect(
        page.getByRole("link", { name: /client booking/i })
      ).toHaveAttribute("href", new RegExp(`/book/${tenant.slug}`));
      await expect(page.getByRole("link", { name: /tablet display/i })).toHaveAttribute(
        "href",
        new RegExp(`/display/${tenant.slug}`)
      );
      await expect(page.getByRole("link", { name: /reception desk/i })).toHaveAttribute(
        "href",
        new RegExp(`/display/${tenant.slug}/reception`)
      );
      await expect(page.getByRole("link", { name: /^manager$/i })).toHaveAttribute(
        "href",
        new RegExp(`salon=${tenant.slug}`)
      );
      await expect(page.getByRole("link", { name: /stylist app/i })).toHaveAttribute(
        "href",
        new RegExp(`salon=${tenant.slug}`)
      );
      await page.getByRole("link", { name: /all salons/i }).click();
      await expect(page.getByRole("heading", { name: /^salons$/i })).toBeVisible();
    }
  });

  test("new salon form loads", async ({ page }) => {
    await platformLogin(page);
    await page.getByRole("link", { name: /new salon/i }).click();
    await expect(page).toHaveURL(/\/platform\/salons\/new/);
    await expect(page.getByRole("heading", { name: /new salon/i })).toBeVisible();
  });
});
