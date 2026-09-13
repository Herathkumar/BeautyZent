import { test, expect } from "@playwright/test";
import { bookOnline, continueBookingToProvider, DEMO, nextOpenDate } from "./helpers";

test.describe("Booking edges", () => {
  test("confirmation overlay appears after booking", async ({ page }) => {
    await bookOnline(page, {
      clientName: `Confirm ${Date.now()}`,
      date: nextOpenDate(),
    });
    await expect(page.getByTestId("booking-confirmed")).toBeVisible();
    await expect(page.getByRole("heading", { name: /booking confirmed/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /view appointment/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /back to home/i })).toBeVisible();
  });

  test("selecting service advances booking stepper", async ({ page }) => {
    await page.goto(`/book/${DEMO.slug}`);
    await expect(page.locator(".book-luxe-stepper__label").filter({ hasText: /service/i })).toBeVisible();
    await page.getByRole("button").filter({ hasText: /men'?s haircut|women'?s trim/i }).first().click();
    await continueBookingToProvider(page);
    await expect(
      page.locator(".book-luxe-stepper__step.is-active .book-luxe-stepper__label").filter({
        hasText: /provider/i,
      })
    ).toBeVisible();
  });
});
