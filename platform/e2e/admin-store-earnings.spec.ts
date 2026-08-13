import { test, expect } from "@playwright/test";
import { acceptConfirm, adminLogin, createAppointmentAtOpenSlot, gotoSettled } from "./helpers";

test.describe("Manager store earnings", () => {
  test("dashboard shows today + this week store earnings", async ({ page }) => {
    await adminLogin(page);
    await gotoSettled(page, "/manager");
    const card = page.getByTestId("dashboard-store-earnings");
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card.getByText(/store earnings/i)).toBeVisible();
    await expect(card.getByTestId("dashboard-daily-goal-ring")).toBeVisible();
    await expect(card.getByText(/today.*profit/i)).toBeVisible();
    await expect(card.getByText(/this week.*profit/i)).toBeVisible();
    await card.click();
    await expect(page).toHaveURL(/\/manager\/earnings/);
    await expect(page.getByRole("heading", { name: /store earnings/i })).toBeVisible();
  });

  test("store earnings page shows week bars and CSV", async ({ page }) => {
    await adminLogin(page);
    await gotoSettled(page, "/manager/earnings");
    await expect(page).toHaveURL(/\/manager\/earnings/);
    await expect(page.getByTestId("store-earnings-page")).toBeVisible();
    await expect(page.getByTestId("store-earnings-goal")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("store-earnings-goal").getByText(/^goal$/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /edit weekly goal/i })).toBeVisible();
    await expect(page.getByTestId("store-earnings-today")).toBeVisible();
    await expect(page.getByTestId("store-earnings-week")).toBeVisible();
    await expect(page.getByTestId("store-earnings-today").getByText(/store profit/i)).toBeVisible();
    await expect(page.getByTestId("store-earnings-week").getByText(/^Paid out/i)).toBeVisible();
    await page.getByTestId("store-earnings-today").click();
    await expect(page.getByTestId("store-earnings-breakdown")).toBeVisible();
    await expect(page.getByRole("heading", { name: /today.?s earnings/i })).toBeVisible();
    await page.getByRole("button", { name: /^close$/i }).click();
    await expect(page.getByTestId("store-earnings-breakdown")).toHaveCount(0);
    await page.getByTestId("store-earnings-week").click();
    await expect(page.getByTestId("store-earnings-breakdown")).toBeVisible();
    await expect(page.getByRole("heading", { name: /week of/i })).toBeVisible();
    await page.getByRole("button", { name: /^close$/i }).click();
    const stylistCard = page.getByTestId("store-earnings-by-stylist").locator("button").first();
    if (await stylistCard.count()) {
      const name = (await stylistCard.locator("p").first().textContent()) || "";
      await stylistCard.click();
      await expect(page.getByTestId("store-earnings-breakdown")).toBeVisible();
      if (name.trim()) {
        await expect(
          page.getByRole("heading", { name: new RegExp(name.trim(), "i") })
        ).toBeVisible();
      }
      await page.getByRole("button", { name: /^close$/i }).click();
    }
    await expect(page.getByTestId("store-earnings-bars")).toBeVisible({ timeout: 15_000 });
    const legend = page.locator("section").filter({ has: page.getByTestId("store-earnings-bars") });
    await expect(legend.getByText("Revenue", { exact: true })).toBeVisible();
    await expect(legend.getByText("Profit", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /download csv/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /activity/i })).toBeVisible();
    const filters = page.getByTestId("store-earnings-activity-filters");
    await expect(filters).toBeVisible();
    await expect(filters.getByLabel(/filter activity type/i)).toBeVisible();
    await expect(filters.getByLabel(/filter activity stylist/i)).toBeVisible();
    await expect(filters.getByLabel(/filter activity status/i)).toBeVisible();
    await expect(filters.getByLabel(/search activity/i)).toBeVisible();
    await filters.getByLabel(/filter activity type/i).selectOption("PAYOUT");
  });

  test("manager can update store regular hours on Payroll", async ({ page }) => {
    await adminLogin(page);
    await gotoSettled(page, "/manager/pay");
    const form = page.getByTestId("store-hours-form");
    await expect(form).toBeVisible({ timeout: 15_000 });
    await form.getByLabel(/store open hour/i).selectOption("10");
    await form.getByLabel(/store close hour/i).selectOption("19");
    // Checkboxes are sr-only inside pill labels — force avoids label intercept
    await form.getByLabel(/sunday off/i).uncheck({ force: true });
    await form.getByLabel(/monday off/i).check({ force: true });
    const saved = page.waitForResponse(
      (r) => r.url().includes("/api/admin/salon") && r.request().method() === "PATCH"
    );
    await form.getByRole("button", { name: /save store hours/i }).click();
    const savedRes = await saved;
    expect(savedRes.ok(), await savedRes.text()).toBeTruthy();
    await expect(form.getByText(/store hours saved/i)).toBeVisible({ timeout: 10_000 });

    // Restore seed defaults
    await form.getByLabel(/store open hour/i).selectOption("9");
    await form.getByLabel(/store close hour/i).selectOption("18");
    await form.getByLabel(/monday off/i).uncheck({ force: true });
    await form.getByLabel(/sunday off/i).check({ force: true });
    await form.getByRole("button", { name: /save store hours/i }).click();
    await expect(form.getByText(/store hours saved/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("void and restore a completed job from store earnings", async ({ page }) => {
    const clientName = `StoreEarn ${Date.now()}`;
    await adminLogin(page);

    const created = await createAppointmentAtOpenSlot(page, {
      clientName,
      notes: "E2E store earnings void",
    });
    const appointmentId = created.appointmentId;

    const doneRes = await page.request.patch("/api/admin/appointments", {
      data: {
        id: appointmentId,
        status: "COMPLETED",
        chargedCents: 4000,
        tipCents: 300,
      },
    });
    expect(doneRes.ok(), await doneRes.text()).toBeTruthy();

    await gotoSettled(page, "/manager/earnings");
    await expect(page.getByTestId("store-earnings-activity")).toBeVisible({ timeout: 15_000 });
    const row = page
      .getByTestId("store-earnings-activity")
      .locator("li")
      .filter({ hasText: clientName })
      .first();
    await expect(row).toBeVisible();
    await expect(row.getByText(/\$43\.00/)).toBeVisible();

    await row.getByRole("button", { name: /void \/ exclude/i }).click();
    await acceptConfirm(page);
    await expect(page.getByText(/voided from store/i)).toBeVisible({ timeout: 10_000 });
    const voidedRow = page
      .getByTestId("store-earnings-activity")
      .locator("li")
      .filter({ hasText: clientName })
      .first();
    await expect(voidedRow.getByText(/job · voided/i)).toBeVisible();

    await voidedRow.getByRole("button", { name: /^restore$/i }).click();
    await acceptConfirm(page);
    await expect(page.getByText(/restored to totals/i)).toBeVisible({ timeout: 10_000 });
    await expect(
      page
        .getByTestId("store-earnings-activity")
        .locator("li")
        .filter({ hasText: clientName })
        .getByRole("button", { name: /void \/ exclude/i })
    ).toBeVisible({ timeout: 10_000 });
  });
});
