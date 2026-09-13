import { test, expect } from "@playwright/test";
import { adminLogin, bookOnline, continueBookingToProvider, DEMO, gotoSettled, nextOpenDate } from "./helpers";

test.describe("Client online booking flow", () => {
  test("service → stylist → time → details → confirmed", async ({ page }) => {
    const clientName = `QA Client ${Date.now()}`;

    await bookOnline(page, {
      clientName,
      phone: "9055550199",
      notes: "Playwright QA booking — safe to cancel",
      date: nextOpenDate(),
    });

    await expect(page.getByTestId("booking-confirmed")).toBeVisible();
    await expect(page.getByRole("heading", { name: /booking confirmed/i })).toBeVisible();
  });

  test("new admin service appears with stylists (regression)", async ({ page }) => {
    const serviceName = `QA Auto Service ${Date.now()}`;

    await adminLogin(page);
    await gotoSettled(page, "/manager/services");
    await expect(page.getByRole("heading", { name: /services/i })).toBeVisible();
    // Skip AI image generation — slow/flaky in e2e and not needed for this regression.
    await page.getByLabel(/generate ai menu image/i).uncheck();
    await page.getByPlaceholder(/service name/i).fill(serviceName);
    await page.locator("form select").first().selectOption("MEN");
    await page.locator('form input[type="number"]').first().fill("20");
    await page.getByPlaceholder(/^price$/i).fill("22");
    await page.getByRole("button", { name: /^add$/i }).click();
    await expect(page.getByText(serviceName)).toBeVisible({ timeout: 30_000 });

    // Create already links the new service to all stylists — avoid full-mesh "link all"
    // which would overwrite specialty menus (Aisha women-only / Omar men-only).
    const serviceRow = page.locator("div.flex.flex-wrap.items-center").filter({ hasText: serviceName });
    await expect(serviceRow.getByText(/\d+ stylists?/i)).toBeVisible();
    await expect(serviceRow.getByText(/not bookable online yet/i)).toHaveCount(0);

    await gotoSettled(page, `/book/${DEMO.slug}`);
    await expect(page.getByRole("heading", { name: /choose services?/i })).toBeVisible();
    const serviceBtn = page.getByRole("button", {
      name: new RegExp(serviceName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
    });
    await expect(serviceBtn).toBeVisible({ timeout: 15_000 });
    await serviceBtn.click();
    await continueBookingToProvider(page);
    await expect(
      page.getByRole("button").filter({ hasText: /farzana|aisha|omar|aadil/i }).first()
    ).toBeVisible();

    // Disable so later walk-in / stylist tests don't see an extra catalog row
    await gotoSettled(page, "/manager/services");
    const cleanupRow = page.locator("div.flex.flex-wrap.items-center").filter({
      hasText: serviceName,
    });
    await cleanupRow.getByRole("button", { name: /^disable$/i }).click();
    await expect(cleanupRow.getByText(/inactive/i)).toBeVisible({ timeout: 10_000 });
  });
});
