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

    const block = page
      .getByTestId("stylist-day-timeline")
      .locator("article")
      .filter({ hasText: clientName })
      .first();
    if (isToday && (await block.count()) > 0) {
      await block.click();
      const sheet = page.getByTestId("stylist-checkin-sheet");
      await expect(sheet).toBeVisible();
      if (await sheet.getByRole("button", { name: /^check in$/i }).count()) {
        await sheet.getByRole("button", { name: /^check in$/i }).click();
        await expect(sheet.getByText(/checked in/i)).toBeVisible({ timeout: 15_000 });
      }
      if (await sheet.getByRole("button", { name: /^done$/i }).count()) {
        // Done prompts: service charge, then tip
        page.on("dialog", async (d) => {
          const msg = d.message().toLowerCase();
          if (msg.includes("tip")) await d.accept("5.00");
          else if (msg.includes("charge") || msg.includes("$")) await d.accept("45.00");
          else await d.accept("0");
        });
        await sheet.getByRole("button", { name: /^done$/i }).click();
        await expect(page.getByTestId("stylist-checkin-sheet")).toHaveCount(0, {
          timeout: 10_000,
        });
        await expect(
          page
            .getByTestId("stylist-day-timeline")
            .locator("article")
            .filter({ hasText: clientName })
        ).toHaveCount(0);
        await expect(
          page.getByTestId("stylist-done-today").getByText(clientName)
        ).toBeVisible();
      }
      await adminLogin(page);
      await page.goto(`/display/${DEMO.slug}/reception`);
      await expect(page.getByText(clientName).first()).toBeVisible({ timeout: 15_000 });
    } else {
      await expect(page.getByText(/coming up|today on the floor/i).first()).toBeVisible();
    }
  });
});
