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
    await expect(page.getByRole("heading", { name: /choose a service/i })).toBeVisible();
  });

  test("visit website link is present after confirm", async ({ page }) => {
    await bookOnline(page, {
      clientName: `WebLink ${Date.now()}`,
      date: nextOpenDate(),
    });
    const link = page.getByRole("link", { name: /visit our website/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", /fhsalon\.ca/);
  });

  test("selecting service shows step chips progress", async ({ page }) => {
    await page.goto(`/book/${DEMO.slug}`);
    await expect(page.locator(".book-step").filter({ hasText: /service/i })).toBeVisible();
    await page.getByRole("button").filter({ hasText: /men'?s haircut|women'?s trim/i }).first().click();
    await expect(page.locator(".book-step.is-active").filter({ hasText: /stylist/i })).toBeVisible();
  });
});

