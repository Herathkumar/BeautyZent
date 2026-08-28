import { test, expect } from "@playwright/test";
import { bookOnlineForTenant, managerLogin } from "./helpers";
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

    test(`${tenant.slug} customer display shows today's board`, async ({ page }) => {
      await page.goto(`/display/${tenant.slug}`);
      const pin = page.getByTestId("display-pin-pad");
      if (await pin.isVisible({ timeout: 3_000 }).catch(() => false)) {
        test.info().annotations.push({
          type: "note",
          description: `${tenant.slug} display is PIN-locked; skipping board checks`,
        });
        await expect(pin).toBeVisible();
        return;
      }
      await expect(page.getByTestId("store-display-board")).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId("display-tab-services")).toHaveCount(0);
      await expect(page.getByTestId("display-tab-products")).toHaveCount(0);
    });

    test(`${tenant.slug} customer display switches between lounge and schedule`, async ({
      page,
    }) => {
      await page.goto(`/display/${tenant.slug}`);
      const pin = page.getByTestId("display-pin-pad");
      if (await pin.isVisible({ timeout: 3_000 }).catch(() => false)) {
        test.info().annotations.push({
          type: "note",
          description: `${tenant.slug} display is PIN-locked; skipping view switch`,
        });
        await expect(pin).toBeVisible();
        return;
      }
      const board = page.getByTestId("customer-view");
      await expect(board).toHaveAttribute("data-customer-view", "lounge", { timeout: 20_000 });

      await page.getByTestId("customer-view-timeline").click();
      await expect(board).toHaveAttribute("data-customer-view", "timeline");
      await expect(page.getByTestId("reception-cal-scroll")).toBeVisible();

      // The tablet remembers the choice across a reload.
      await page.reload();
      await expect(page.getByTestId("customer-view")).toHaveAttribute(
        "data-customer-view",
        "timeline",
        { timeout: 20_000 }
      );

      await page.getByTestId("customer-view-lounge").click();
      await expect(page.getByTestId("customer-view")).toHaveAttribute(
        "data-customer-view",
        "lounge"
      );
    });

    test(`${tenant.slug} reception display shows schedule and client panel`, async ({
      page,
    }) => {
      await managerLogin(page, tenant);
      await page.goto(`/display/${tenant.slug}/reception`);
      await expect(page.getByTestId("store-display-board")).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId("reception-client-panel")).toBeVisible();
      await expect(page.getByTestId("reception-new-booking")).toBeVisible();
    });
  }
});
