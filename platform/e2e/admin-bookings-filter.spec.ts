import { test, expect } from "@playwright/test";
import { adminLogin, bookOnline, bookableDateNearToday } from "./helpers";

test.describe("Admin bookings filters & no-show", () => {
  test("filter bar and mark no-show", async ({ page }) => {
    const clientName = `NoShow ${Date.now()}`;
    const bookedDate = await bookOnline(page, {
      clientName,
      phone: "9055550199",
      notes: "E2E no-show filter",
      stylistPattern: /farzana/i,
      date: bookableDateNearToday(),
    });

    await adminLogin(page);
    await page.goto("/admin/appointments");
    await expect(page.getByRole("heading", { name: /^bookings$/i })).toBeVisible();
    const stylistFilter = page.getByRole("combobox", { name: /stylist/i });
    const statusFilter = page.getByRole("combobox", { name: /status/i });
    await expect(stylistFilter).toBeVisible();
    await expect(statusFilter).toBeVisible();
    await expect(page.getByText(clientName).first()).toBeVisible({ timeout: 15_000 });

    await stylistFilter.selectOption({ label: "Farzana" });
    await expect(page.getByText(clientName).first()).toBeVisible({ timeout: 10_000 });

    const row = page.locator(".divide-y > div").filter({ hasText: clientName }).first();
    await expect(row.getByRole("button", { name: /mark no-show/i })).toBeVisible();

    page.once("dialog", (d) => d.accept());
    await row.getByRole("button", { name: /mark no-show/i }).click();
    await expect(row.getByText(/no show/i)).toBeVisible({ timeout: 10_000 });

    await statusFilter.selectOption("no_show");
    await expect(page.getByText(clientName).first()).toBeVisible({ timeout: 15_000 });

    await page.getByLabel(/^day$/i).fill(bookedDate);
    await expect(page.getByText(clientName).first()).toBeVisible({ timeout: 10_000 });
  });

  test("status no-show filter loads without error", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/appointments");
    await expect(page.getByRole("heading", { name: /^bookings$/i })).toBeVisible();
    await page.getByRole("combobox", { name: /status/i }).selectOption("no_show");
    await expect(
      page.getByText(/no bookings match these filters|no show|no-shows/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
