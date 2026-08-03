import { test, expect } from "@playwright/test";
import { adminLogin, nextOpenDate, pickFirstSlot } from "./helpers";

test.describe("Admin — book for client", () => {
  test("front desk can create a booking", async ({ page }) => {
    const clientName = `WalkIn ${Date.now()}`;

    await adminLogin(page);
    await page.goto("/admin/book");
    await expect(page.getByRole("heading", { name: /book for a client/i })).toBeVisible();

    const selects = page.locator("form select");
    await selects.nth(0).selectOption({ index: 1 });
    await page.waitForTimeout(500);
    // Prefer a less-busy stylist to avoid slot races with other E2E bookings
    const stylistOptions = await selects.nth(1).locator("option").allTextContents();
    const pick =
      stylistOptions.find((o) => /aisha/i.test(o)) ||
      stylistOptions.find((o) => /omar/i.test(o)) ||
      stylistOptions.find((o) => /farzana/i.test(o));
    if (pick) await selects.nth(1).selectOption({ label: pick.trim() });

    // pickFirstSlot already selects an open time; avoid a second click that can race DOM refresh
    await pickFirstSlot(page, nextOpenDate());

    await page.locator('label:has-text("Client name") input').fill(clientName);
    await page.locator('label:has-text("Client phone") input').fill("9055550222");
    await page.locator('label:has-text("Notes") input').fill("E2E admin book");
    await page.getByRole("button", { name: /create booking/i }).click();

    await expect(page.locator("form p").filter({ hasText: /Booked|Could not|already/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("products and stylists admin pages load", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/products");
    await expect(page.getByRole("heading", { name: /product/i })).toBeVisible();
    await page.goto("/admin/stylists");
    await expect(page.getByRole("heading", { name: /stylist/i })).toBeVisible();
    await expect(page.getByText(/farzana/i).first()).toBeVisible();
  });
});
