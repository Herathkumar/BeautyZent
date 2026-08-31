import { test, expect } from "@playwright/test";
import { bookOnline, DEMO, nextOpenDate } from "./helpers";

test.describe("Booking edges", () => {
  test("confirmation shows add to calendar on the booking card", async ({ page }) => {
    await bookOnline(page, {
      clientName: `Confirm ${Date.now()}`,
      date: nextOpenDate(),
    });
    await expect(page.getByTestId("booking-confirmed")).toBeVisible();
    await expect(page.getByRole("link", { name: /add to calendar/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /book another/i })).toHaveCount(0);
    await expect(page.getByTestId("booking-next-steps")).toHaveCount(0);
  });

  test("selecting service shows step chips progress", async ({ page }) => {
    await page.goto(`/book/${DEMO.slug}`);
    await expect(page.locator(".book-step").filter({ hasText: /service/i })).toBeVisible();
    await page.getByRole("button").filter({ hasText: /men'?s haircut|women'?s trim/i }).first().click();
    await expect(page.locator(".book-step.is-active").filter({ hasText: /stylist/i })).toBeVisible();
  });
});

