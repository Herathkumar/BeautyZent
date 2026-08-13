import { test, expect, type Page } from "@playwright/test";
import {
  adminLogin,
  bookOnline,
  bookableDateNearToday,
  clearOpenBookingsForStylist,
  DEMO,
  gotoSettled,
  stylistLogin,
  todayDate,
} from "./helpers";

async function assertNoCrashOverlay(page: Page) {
  await expect(page.getByText(/maximum update depth exceeded/i)).toHaveCount(0);
}

/**
 * Guest books online (prefer today) → confirmation, manager, stylist, and display
 * all show that client. Covers the WalkInPanel crash that hid stylist jobs.
 */
test.describe("Guest booking visibility across apps", () => {
  test("guest book today appears on booking, manager, stylist, and display", async ({
    page,
  }) => {
    const clientName = `Guest Priya ${Date.now()}`;
    const targetDate = bookableDateNearToday();

    await adminLogin(page);
    await clearOpenBookingsForStylist(page, /farzana/i);

    // Short service so a late-day run can still land on today (60min cuts often cannot).
    const bookedDate = await bookOnline(page, {
      clientName,
      phone: "9055550142",
      notes: "E2E guest visibility",
      servicePattern: /bang \/ fringe trim/i,
      stylistPattern: /farzana/i,
      date: targetDate,
    });
    await expect(page.getByRole("heading", { name: /you.?re booked/i })).toBeVisible();
    await assertNoCrashOverlay(page);

    await adminLogin(page);
    await gotoSettled(page, "/manager/appointments");
    await expect(page.getByText(clientName).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/E2E guest visibility/i).first()).toBeVisible();
    await assertNoCrashOverlay(page);

    await stylistLogin(page);
    await expect(page).toHaveURL(/\/stylist(?!\/login)/);
    await expect(page.getByText(/hi,/i).first()).toBeVisible({ timeout: 15_000 });
    await assertNoCrashOverlay(page);
    await expect(page.getByText(clientName).first()).toBeVisible({ timeout: 15_000 });

    if (bookedDate === todayDate()) {
      await expect(
        page.getByText(/nothing on the book for today/i)
      ).toHaveCount(0);
      const card = page.locator("article").filter({ hasText: clientName }).first();
      await expect(card).toBeVisible();
    } else {
      await expect(page.getByText(/coming up/i).first()).toBeVisible();
    }

    await page.goto(`/display/${DEMO.slug}`);
    await expect(page.getByTestId("store-display-board")).toBeVisible({
      timeout: 15_000,
    });
    await assertNoCrashOverlay(page);
    await expect(page.getByText(clientName).first()).toBeVisible({ timeout: 15_000 });
  });
});
