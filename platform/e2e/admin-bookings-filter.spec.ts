import { test, expect } from "@playwright/test";
import { acceptConfirm, adminLogin, bookOnline, fillDateInput, gotoSettled, nextOpenDate } from "./helpers";

test.describe("Admin bookings filters & no-show", () => {
  test("filter bar and mark no-show", async ({ page }) => {
    const clientName = `NoShow ${Date.now()}`;
    const bookedDate = await bookOnline(page, {
      clientName,
      phone: `905${String(Date.now()).slice(-7)}`,
      notes: "E2E no-show filter",
      stylistPattern: /farzana/i,
      date: nextOpenDate(),
    });

    await adminLogin(page);
    await gotoSettled(page, "/manager/appointments");
    await expect(page.getByRole("heading", { name: /^bookings$/i })).toBeVisible();
    await expect(page.getByText(/loading bookings/i)).toHaveCount(0);
    await expect(page.getByText(clientName).first()).toBeVisible({ timeout: 15_000 });

    const stylistFilter = page.getByRole("combobox", { name: /stylist/i });
    const statusFilter = page.getByRole("combobox", { name: /status/i });
    await expect(stylistFilter).toBeVisible();
    await expect(statusFilter).toBeVisible();

    const row = page
      .getByTestId("booking-row")
      .filter({ has: page.getByText(clientName, { exact: true }) })
      .filter({ has: page.getByRole("button", { name: /mark no-show/i }) });
    await expect(row).toHaveCount(1);
    await expect(row.getByRole("button", { name: /mark no-show/i })).toBeVisible();
    await row.getByRole("button", { name: /mark no-show/i }).click();
    await acceptConfirm(page);
    await expect(
      page
        .getByTestId("booking-row")
        .filter({ has: page.getByText(clientName, { exact: true }) })
        .getByText(/^no show$/i)
    ).toBeVisible({ timeout: 10_000 });

    const afterStylist = page.waitForResponse(
      (r) => r.url().includes("/api/admin/appointments") && r.request().method() === "GET",
      { timeout: 10_000 }
    );
    await stylistFilter.selectOption({ label: "Farzana" });
    await afterStylist.catch(() => undefined);
    await expect(page.getByText(/loading bookings/i)).toHaveCount(0);
    await expect(page.getByText(clientName).first()).toBeVisible({ timeout: 10_000 });

    await statusFilter.selectOption("no_show");
    await expect(page.getByText(clientName).first()).toBeVisible({ timeout: 15_000 });

    await fillDateInput(page.getByLabel(/^day$/i), bookedDate);
    await expect(page.getByText(/loading bookings/i)).toHaveCount(0);
    await expect(page.getByText(clientName).first()).toBeVisible({ timeout: 10_000 });
  });

  test("status no-show filter loads without error", async ({ page }) => {
    await adminLogin(page);
    await gotoSettled(page, "/manager/appointments");
    await expect(page.getByRole("heading", { name: /^bookings$/i })).toBeVisible();
    await page.getByRole("combobox", { name: /status/i }).selectOption("no_show");
    await expect(
      page.getByText(/no bookings match these filters|no show|no-shows/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
