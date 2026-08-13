import { test, expect } from "@playwright/test";
import { bookOnlineForTenant } from "./helpers";
import { TENANTS } from "./tenants";

test.describe("Public booking + display", () => {
  for (const tenant of TENANTS) {
    test(`${tenant.slug} booking wizard loads branded catalog`, async ({ page }) => {
      await page.goto(`/book/${tenant.slug}`);
      await expect(page.getByRole("heading", { name: /choose services?/i })).toBeVisible({
        timeout: 20_000,
      });
      await expect(
        page.getByRole("button").filter({ hasText: tenant.servicePattern }).first()
      ).toBeVisible();
    });

    test(`${tenant.slug} guest can complete an online booking`, async ({ page }) => {
      const clientName = `QA Book ${tenant.id} ${Date.now()}`;
      await bookOnlineForTenant(page, tenant, { clientName });
      await expect(page.getByTestId("booking-confirmed")).toBeVisible();
      await expect(page.getByText(new RegExp(tenant.stylistName, "i")).first()).toBeVisible();
    });

    test(`${tenant.slug} floor display loads floor, services, and products tabs`, async ({
      page,
    }) => {
      await page.goto(`/display/${tenant.slug}`);
      const pin = page.getByTestId("display-pin-pad");
      if (await pin.isVisible({ timeout: 3_000 }).catch(() => false)) {
        test.info().annotations.push({
          type: "note",
          description: `${tenant.slug} display is PIN-locked; skipping tab checks`,
        });
        await expect(pin).toBeVisible();
        return;
      }
      await expect(page.getByTestId("store-display-board")).toBeVisible({ timeout: 20_000 });
      await page.getByTestId("display-tab-services").click();
      await expect(page.getByTestId("display-services-section")).toBeVisible();
      await page.getByTestId("display-tab-products").click();
      await expect(page.getByTestId("display-products-section")).toBeVisible();
    });
  }
});
