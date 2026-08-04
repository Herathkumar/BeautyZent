import { test, expect } from "@playwright/test";
import { adminLogin, todayDate } from "./helpers";

test.describe("Manager store earnings", () => {
  test("dashboard shows today + this week store earnings", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/manager");
    const card = page.getByTestId("dashboard-store-earnings");
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card.getByText(/store earnings/i)).toBeVisible();
    await expect(card.getByText(/today.*profit/i)).toBeVisible();
    await expect(card.getByText(/this week.*profit/i)).toBeVisible();
    await card.click();
    await expect(page).toHaveURL(/\/manager\/earnings/);
    await expect(page.getByRole("heading", { name: /store earnings/i })).toBeVisible();
  });

  test("salon menu opens Store Earnings with week bars and CSV", async ({ page }) => {
    await adminLogin(page);
    await page.locator(".admin-header-nav").getByRole("button", { name: /salon/i }).click();
    await page.getByRole("menuitem", { name: /store earnings/i }).click();
    await expect(page).toHaveURL(/\/manager\/earnings/);
    await expect(page.getByTestId("store-earnings-page")).toBeVisible();
    await expect(page.getByTestId("store-earnings-today")).toBeVisible();
    await expect(page.getByTestId("store-earnings-week")).toBeVisible();
    await expect(page.getByTestId("store-earnings-today").getByText(/store profit/i)).toBeVisible();
    await expect(page.getByTestId("store-earnings-week").getByText(/^Paid out/i)).toBeVisible();
    await expect(page.getByTestId("store-earnings-bars")).toBeVisible({ timeout: 15_000 });
    const legend = page.locator("section").filter({ has: page.getByTestId("store-earnings-bars") });
    await expect(legend.getByText("Revenue", { exact: true })).toBeVisible();
    await expect(legend.getByText("Profit", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /download csv/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /activity/i })).toBeVisible();
  });

  test("manager can update store regular hours on Account", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/manager/account");
    const form = page.getByTestId("store-hours-form");
    await expect(form).toBeVisible({ timeout: 15_000 });
    await form.getByLabel(/store open hour/i).selectOption("10");
    await form.getByLabel(/store close hour/i).selectOption("19");
    await form.getByRole("button", { name: /save store hours/i }).click();
    await expect(page.getByText(/store hours saved|new stylists/i)).toBeVisible({
      timeout: 10_000,
    });

    // Restore seed defaults
    await form.getByLabel(/store open hour/i).selectOption("9");
    await form.getByLabel(/store close hour/i).selectOption("18");
    await form.getByRole("button", { name: /save store hours/i }).click();
    await expect(page.getByText(/store hours saved|new stylists/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("void and restore a completed job from store earnings", async ({ page }) => {
    const clientName = `StoreEarn ${Date.now()}`;
    await adminLogin(page);

    const stylistsRes = await page.request.get("/api/admin/stylists");
    expect(stylistsRes.ok()).toBeTruthy();
    const stylistsJson = await stylistsRes.json();
    const stylist =
      stylistsJson.stylists?.find((s: { name: string }) => /farzana/i.test(s.name)) ||
      stylistsJson.stylists?.[0];
    expect(stylist?.id).toBeTruthy();

    const servicesRes = await page.request.get("/api/admin/services");
    expect(servicesRes.ok()).toBeTruthy();
    const servicesJson = await servicesRes.json();
    const service = servicesJson.services?.[0];
    expect(service?.id).toBeTruthy();

    // Unique mid-day slot in salon TZ to avoid conflicts with seed bookings.
    const minute = (Date.now() % 50) + 5;
    const startsAt = `${todayDate()}T11:${String(minute).padStart(2, "0")}:00`;

    const createRes = await page.request.post("/api/admin/appointments/create", {
      data: {
        stylistId: stylist.id,
        serviceId: service.id,
        startsAt: new Date(startsAt).toISOString(),
        clientName,
        clientPhone: `905555${String(Date.now()).slice(-4)}`,
        notes: "E2E store earnings void",
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const created = await createRes.json();
    const appointmentId = created.appointment?.id as string;
    expect(appointmentId).toBeTruthy();

    const doneRes = await page.request.patch("/api/admin/appointments", {
      data: {
        id: appointmentId,
        status: "COMPLETED",
        chargedCents: 4000,
        tipCents: 300,
      },
    });
    expect(doneRes.ok()).toBeTruthy();

    await page.goto("/manager/earnings");
    await expect(page.getByTestId("store-earnings-activity")).toBeVisible({ timeout: 15_000 });
    const row = page
      .getByTestId("store-earnings-activity")
      .locator("li")
      .filter({ hasText: clientName })
      .first();
    await expect(row).toBeVisible();
    await expect(row.getByText(/\$43\.00/)).toBeVisible();

    await row.getByRole("button", { name: /void \/ exclude/i }).click();
    await expect(page.getByText(/voided from store/i)).toBeVisible({ timeout: 10_000 });
    const voidedRow = page
      .getByTestId("store-earnings-activity")
      .locator("li")
      .filter({ hasText: clientName })
      .first();
    await expect(voidedRow.getByText(/job · voided/i)).toBeVisible();

    await voidedRow.getByRole("button", { name: /^restore$/i }).click();
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
