import { test, expect } from "@playwright/test";
import { bookOnline, DEMO, nextOpenDate } from "./helpers";

test.describe("Booking edges", () => {
  test("book another resets the wizard", async ({ page }) => {
    await bookOnline(page, {
      clientName: `Another ${Date.now()}`,
      notes: "E2E book another",
      date: nextOpenDate(),
    });
    await page.getByRole("button", { name: /book another/i }).click();
    await expect(page.getByRole("heading", { name: /choose services?/i })).toBeVisible();
  });

  test("confirmation shows calendar and book-another actions", async ({ page }) => {
    await bookOnline(page, {
      clientName: `Confirm ${Date.now()}`,
      date: nextOpenDate(),
    });
    await expect(page.getByRole("link", { name: /add to calendar/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /book another/i })).toBeVisible();
  });

  test("selecting service shows step chips progress", async ({ page }) => {
    await page.goto(`/book/${DEMO.slug}`);
    await expect(page.locator(".book-step").filter({ hasText: /service/i })).toBeVisible();
    await page.getByRole("button").filter({ hasText: /men'?s haircut|women'?s trim/i }).first().click();
    await expect(page.locator(".book-step.is-active").filter({ hasText: /stylist/i })).toBeVisible();
  });
});

