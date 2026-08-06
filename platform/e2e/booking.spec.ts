import { test, expect } from "@playwright/test";
import { DEMO, nextOpenDate } from "./helpers";

test.describe("Client online booking flow", () => {
  test("service → stylist → time → details → confirmed", async ({ page }) => {
    const clientName = `QA Client ${Date.now()}`;
    const openDate = nextOpenDate();

    await page.goto(`/book/${DEMO.slug}`);
    await expect(page.getByRole("heading", { name: /choose a service/i })).toBeVisible();

    // Prefer a short men's service that all stylists usually offer
    const serviceBtn = page
      .getByRole("button")
      .filter({ hasText: /men'?s haircut|women'?s trim|beard/i })
      .first();
    await serviceBtn.click();

    await expect(page.getByRole("heading", { name: /choose your stylist/i })).toBeVisible();
    await expect(
      page.getByText(/no stylist is set up for this service/i)
    ).toHaveCount(0);

    const stylistBtn = page.getByRole("button").filter({ hasText: /farzana|aisha|omar|aadil/i }).first();
    await expect(stylistBtn).toBeVisible();
    await stylistBtn.click();

    await expect(page.getByRole("heading", { name: /pick a time/i })).toBeVisible();
    await page.locator('input[type="date"]').fill(openDate);

    // Wait for slots to load; try nearby weekdays if empty
    let booked = false;
    for (let attempt = 0; attempt < 5 && !booked; attempt++) {
      const d = new Date(openDate);
      d.setDate(d.getDate() + attempt);
      if (d.getDay() === 0) continue;
      const pad = (n: number) => String(n).padStart(2, "0");
      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      await page.locator('input[type="date"]').fill(dateStr);
      await page.waitForTimeout(800);

      const slotButtons = page.getByRole("button").filter({ hasText: /\d{1,2}:\d{2}|a\.m\.|p\.m\./i });
      if ((await slotButtons.count()) === 0) continue;
      await slotButtons.first().click();
      booked = true;
    }

    expect(booked, "Expected at least one open slot in the next weekdays").toBeTruthy();

    await expect(page.getByRole("heading", { name: /your details/i })).toBeVisible();
    await page.getByLabel(/^name$/i).fill(clientName);
    await page.getByLabel(/^phone$/i).fill("9055550199");
    await page.getByLabel(/^email/i).fill(`qa.book.${Date.now()}@example.com`);
    await page.getByLabel(/notes/i).fill("Playwright QA booking — safe to cancel");
    await page.getByRole("button", { name: /confirm reservation/i }).click();

    await expect(page.getByRole("heading", { name: /you.?re booked/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("button", { name: /book another/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /add to calendar/i })).toBeVisible();
    await expect(page.getByTestId("booking-next-steps")).toBeVisible();
  });

  test("new admin service appears with stylists (regression)", async ({ page }) => {
    const serviceName = `QA Auto Service ${Date.now()}`;

    await page.goto("/manager/login");
    await page.getByLabel(/email/i).fill(DEMO.adminEmail);
    await page.getByLabel(/password/i).fill(DEMO.password);
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL(/\/manager(?!\/login)/, { timeout: 20_000 });

    await page.goto("/manager/services");
    await page.getByPlaceholder(/service name/i).fill(serviceName);
    await page.locator("form select").first().selectOption("MEN");
    await page.locator('form input[type="number"]').first().fill("20");
    await page.getByPlaceholder(/^price$/i).fill("22");
    await page.getByRole("button", { name: /^add$/i }).click();
    await expect(page.getByText(serviceName)).toBeVisible({ timeout: 15_000 });

    // Repair any missing stylist links, then assert this service is bookable
    await page.getByRole("button", { name: /link all services/i }).click();
    await expect(page.getByText(/linked services to stylists/i)).toBeVisible({ timeout: 15_000 });
    const serviceRow = page.locator("div.flex.flex-wrap.items-center").filter({ hasText: serviceName });
    await expect(serviceRow.getByText(/\d+ stylists?/i)).toBeVisible();
    await expect(serviceRow.getByText(/not bookable online yet/i)).toHaveCount(0);

    await page.goto(`/book/${DEMO.slug}`);
    await page
      .getByRole("button", {
        name: new RegExp(serviceName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
      })
      .click();
    await expect(page.getByRole("heading", { name: /choose your stylist/i })).toBeVisible();
    await expect(
      page.getByRole("button").filter({ hasText: /farzana|aisha|omar|aadil/i }).first()
    ).toBeVisible();
  });
});
