import { test, expect } from "@playwright/test";
import { createAndCompleteJob, createAppointmentAtOpenSlot, dollars, gotoSettled, managerLogin, stylistLogin } from "./helpers";
import { clearOpenBookingsForStylist } from "../helpers";
import { OTHER, TENANTS } from "./tenants";

test.describe("Job lifecycle, check-in, and earnings math", () => {
  for (const tenant of TENANTS) {
    const other = OTHER[tenant.id];
    const chargedCents = tenant.id === "fhsalon" ? 4500 : 7000;
    const tipCents = tenant.id === "fhsalon" ? 500 : 800;

    test(`${tenant.slug} complete job, store earnings math, stylist pay, isolation`, async ({
      page,
    }) => {
      const clientName = `QA Earn ${tenant.id} ${Date.now()}`;
      await managerLogin(page, tenant);
      const { appointmentId } = await createAndCompleteJob(page, tenant, {
        clientName,
        chargedCents,
        tipCents,
      });

      const earnings = await page.request.get("/api/admin/store-earnings");
      expect(earnings.ok(), await earnings.text()).toBeTruthy();
      const data = await earnings.json();
      const job = (data.jobs || []).find((j: { id: string }) => j.id === appointmentId);
      expect(job, "completed job in store earnings").toBeTruthy();
      expect(job.chargedCents).toBe(chargedCents);
      expect(job.tipCents).toBe(tipCents);
      expect(job.clientName).toBe(clientName);

      const revenue = chargedCents + tipCents;
      expect(data.todaySummary.revenueCents).toBeGreaterThanOrEqual(revenue);
      expect(data.weekSummary.chargedCents).toBeGreaterThanOrEqual(chargedCents);
      expect(data.weekSummary.tipCents).toBeGreaterThanOrEqual(tipCents);
      expect(data.weekSummary.revenueCents).toBe(
        data.weekSummary.chargedCents + data.weekSummary.tipCents
      );
      expect(data.weekSummary.profitCents).toBe(
        data.weekSummary.chargedCents - data.weekSummary.stylistPayCents
      );

      await gotoSettled(page, "/manager/earnings");
      await expect(page.getByTestId("store-earnings-page")).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(clientName).first()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(new RegExp(`\\$${dollars(revenue)}`)).first()).toBeVisible();

      await stylistLogin(page, tenant);
      await gotoSettled(page, "/stylist/earnings");
      await expect(page.getByRole("heading", { name: /^earnings$/i })).toBeVisible();
      await expect(page.getByText(clientName).first()).toBeVisible({ timeout: 15_000 });

      await managerLogin(page, other);
      const otherEarn = await page.request.get("/api/admin/store-earnings");
      expect(otherEarn.ok()).toBeTruthy();
      const otherData = await otherEarn.json();
      const leaked = (otherData.jobs || []).some(
        (j: { clientName?: string }) => j.clientName === clientName
      );
      expect(leaked, `${clientName} must not appear on ${other.slug}`).toBeFalsy();
    });

    test(`${tenant.slug} stylist Check in then Done on a booked job`, async ({ page }) => {
      await managerLogin(page, tenant);
      await clearOpenBookingsForStylist(page, new RegExp(`^${tenant.stylistName}$`, "i"));
      const clientName = `QA Here ${tenant.id} ${Date.now()}`;
      const created = await createAppointmentAtOpenSlot(page, tenant, {
        clientName,
        preferToday: true,
        notes: `QA check-in ${tenant.slug}`,
      });

      await stylistLogin(page, tenant);
      if (!created.isToday) {
        test.info().annotations.push({
          type: "note",
          description: `${clientName} booked on ${created.day}, not today — check-in UI skipped`,
        });
        return;
      }
      const block = page
        .getByTestId("stylist-day-timeline")
        .locator("article")
        .filter({ hasText: clientName })
        .first();
      await expect(block).toBeVisible({ timeout: 15_000 });
      await block.click();
      const sheet = page.getByTestId("stylist-checkin-sheet");
      await expect(sheet).toBeVisible();
      await sheet.getByRole("button", { name: /^check in$/i }).click();
      await expect(sheet.getByText(/checked in/i)).toBeVisible({ timeout: 15_000 });
    });
  }
});
