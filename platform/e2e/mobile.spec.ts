import { test, expect } from "@playwright/test";
import { DEMO, stylistLogin } from "./helpers";

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
    await expect(page.getByRole("heading", { name: /choose a service/i })).toBeVisible();
    await page.getByRole("button").filter({ hasText: /haircut|trim|beard/i }).first().click();
    await expect(page.getByRole("heading", { name: /choose your stylist/i })).toBeVisible();
  });

  test("stylist portal bottom nav on phone", async ({ page }) => {
    await stylistLogin(page);
    await expect(page.getByRole("link", { name: /^today$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^away$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /log out/i })).toBeVisible();
  });

  test("demo hub cards are tappable", async ({ page }) => {
    await page.goto("/demo");
    await expect(page.getByRole("heading", { name: /demo hub/i })).toBeVisible();
    await page.locator(`a[href*="/book/${DEMO.slug}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`/book/${DEMO.slug}`));
  });
});
