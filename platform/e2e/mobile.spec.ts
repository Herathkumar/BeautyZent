import { test, expect } from "@playwright/test";
import { adminLogin, continueBookingToProvider, DEMO, stylistLogin } from "./helpers";

// Chromium + phone viewport (avoids needing WebKit installed)
test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
});

test.describe("Mobile viewport", () => {
  test("client booking usable on phone", async ({ page }) => {
    await page.goto(`/book/${DEMO.slug}`);
    await expect(page.getByRole("heading", { name: /choose services?/i })).toBeVisible();
    const services = page.locator("section").filter({
      has: page.getByRole("heading", { name: /choose services?/i }),
    });
    await services.getByRole("button").filter({ hasText: /haircut|trim|beard/i }).first().click();
    await continueBookingToProvider(page);
  });

  test("stylist portal bottom nav on phone", async ({ page }) => {
    await stylistLogin(page);
    const bottom = page.locator(".stylist-bottom-nav");
    await expect(bottom.getByRole("link", { name: /^my jobs$/i })).toBeVisible();
    await expect(bottom.getByRole("link", { name: /^schedule$/i })).toBeVisible();
    await expect(bottom.getByRole("link", { name: /^earnings$/i })).toBeVisible();
    await expect(bottom.getByRole("link", { name: /^profile$/i })).toBeVisible();

    await page.goto("/stylist/earnings");
    const before = await bottom.boundingBox();
    expect(before).toBeTruthy();
    await page.locator(".stylist-app-main").evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    const after = await bottom.boundingBox();
    expect(after).toBeTruthy();
    expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(2);
  });

  test("admin portal bottom nav on phone", async ({ page }) => {
    await adminLogin(page);
    const bottom = page.locator(".admin-bottom-nav");
    await expect(bottom.getByRole("link", { name: /^dashboard$/i })).toBeVisible();
    await expect(bottom.getByRole("link", { name: /^bookings$/i })).toBeVisible();
    await expect(bottom.getByRole("button", { name: /^money$/i })).toBeVisible();
    await expect(bottom.getByRole("link", { name: /^profile$/i })).toBeVisible();
    await expect(page.locator(".admin-header-nav")).toBeHidden();

    // Nav stays docked at the viewport bottom while content scrolls
    await page.goto("/manager/earnings");
    await expect(bottom).toBeVisible();
    const before = await bottom.boundingBox();
    expect(before).toBeTruthy();
    await page.locator(".admin-app-main").evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    const after = await bottom.boundingBox();
    expect(after).toBeTruthy();
    expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(2);
    expect((after?.y ?? 0) + (after?.height ?? 0)).toBeGreaterThan(800);

    const moneyBtn = bottom.getByRole("button", { name: /^money$/i });
    await moneyBtn.scrollIntoViewIfNeeded();
    await moneyBtn.click({ force: true });
    const sheet = page.getByRole("dialog", { name: /money menu/i });
    await expect(sheet).toBeVisible({ timeout: 10_000 });
    await expect(sheet.getByRole("link", { name: /store earnings/i })).toBeVisible();
    // Accessible name includes hint text ("Payroll Pay, hours & leave")
    await sheet.locator('a[href="/manager/pay"]').click({ force: true });
    await expect(page).toHaveURL(/\/manager\/pay/);
  });

  test("demo hub cards are tappable", async ({ page }) => {
    await page.goto("/demo");
    await expect(page.getByRole("heading", { name: /demo hub/i })).toBeVisible();
    await page.locator(`a[href*="/book/${DEMO.slug}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`/book/${DEMO.slug}`));
  });
});
