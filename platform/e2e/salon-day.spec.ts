import { test, expect } from "@playwright/test";
import {
  adminLogin,
  bookOnline,
  bookableDateNearToday,
  DEMO,
  gotoSettled,
  stylistLogin,
  todayDate,
} from "./helpers";

/**
 * Full salon-day path:
 * client books → admin sees → stylist sees → (if today) complete → display shows name
 */
test.describe("Salon day — full path", () => {
  test("book → stylist/admin see it; complete when on Today", async ({ page }) => {
    const clientName = `DayFlow ${Date.now()}`;

    const bookedDate = await bookOnline(page, {
      clientName,
      phone: "9055550111",
      notes: "E2E salon-day flow",
      stylistPattern: /farzana/i,
      date: bookableDateNearToday(),
    });
    const isToday = bookedDate === todayDate();

    await adminLogin(page);
    await gotoSettled(page, "/manager/appointments");
    await expect(page.getByText(clientName).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/E2E salon-day flow/i).first()).toBeVisible();

    await stylistLogin(page);
    await expect(page.getByText(clientName).first()).toBeVisible({ timeout: 15_000 });

    const card = page.locator("article").filter({ hasText: clientName }).first();
    if (isToday && (await card.count()) > 0) {
      if (await card.getByRole("button", { name: /client is here/i }).count()) {
        await card.getByRole("button", { name: /client is here/i }).click();
        await page.waitForTimeout(500);
      }
      if (await card.getByRole("button", { name: /^done$/i }).count()) {
        // Done prompts: service charge, then tip
        page.on("dialog", async (d) => {
          const msg = d.message().toLowerCase();
          if (msg.includes("tip")) await d.accept("5.00");
          else if (msg.includes("charge") || msg.includes("$")) await d.accept("45.00");
          else await d.accept("0");
        });
        await card.getByRole("button", { name: /^done$/i }).click();
        await expect(card.getByText(/^done$/i).first()).toBeVisible({ timeout: 10_000 });
      }
      await page.goto(`/display/${DEMO.slug}`);
      await expect(page.getByText(clientName).first()).toBeVisible({ timeout: 15_000 });
    } else {
      await expect(page.getByText(/coming up|today/i).first()).toBeVisible();
    }
  });
});
