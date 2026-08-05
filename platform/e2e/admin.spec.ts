import { test, expect } from "@playwright/test";
import { adminLogin, DEMO } from "./helpers";

test.describe("Manager portal", () => {
  test("login and see dashboard links", async ({ page }) => {
    await adminLogin(page);
    await expect(page.getByRole("link", { name: /^dashboard$/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^bookings$/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /money/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^profile$/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /active services/i })).toBeVisible();
    const floor = page.getByTestId("dashboard-who-working");
    await expect(floor).toBeVisible();
    await expect(floor.getByText(/on floor|no one on the floor/i)).toBeVisible();
    const stylist = floor.getByTestId("dashboard-floor-stylist").first();
    if (await stylist.count()) {
      await expect(stylist.getByTestId("dashboard-floor-jobs")).toHaveText(/\d+\s+jobs?/i);
      await expect(stylist.getByTestId("dashboard-floor-available")).toHaveText(
        /open|no open time/i
      );
    }
  });

  test("who's working page lists team for a day", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/manager/working");
    await expect(page.getByRole("heading", { name: /who.?s working/i })).toBeVisible();
    await expect(page.getByLabel(/^date$/i)).toBeVisible();
    await expect(page.getByTestId("working-roster-row").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/on floor|away|day off/i).first()).toBeVisible();
  });

  test("who's working expands stylist job breakdown for selected day", async ({ page }) => {
    await adminLogin(page);

    const catalog = await page.request.get("/api/public/fhsalon/catalog");
    const cat = await catalog.json();
    const stylist = (cat.stylists || [])[0];
    const service = (cat.services || []).find((s: { name: string }) =>
      /^men.?s haircut/i.test(s.name)
    );
    expect(stylist?.id).toBeTruthy();
    expect(service?.id).toBeTruthy();

    const clientName = `FloorJob ${Date.now()}`;
    const walk = await page.request.post("/api/admin/walk-in", {
      data: {
        clientName,
        serviceId: service.id,
        stylistId: stylist.id,
      },
    });
    // If no open slot, still exercise empty/open breakdown UI
    const seated = walk.ok();

    await page.goto(`/manager/working?stylist=${stylist.id}`);
    const row = page.locator(`[data-testid=working-roster-row][data-stylist-id="${stylist.id}"]`);
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("working-jobs-breakdown")).toBeVisible({ timeout: 15_000 });

    if (seated) {
      await expect(page.getByTestId("working-job-row").filter({ hasText: clientName })).toBeVisible({
        timeout: 15_000,
      });
    } else {
      await row.getByTestId("working-stylist-toggle").click();
      await expect(page.getByTestId("working-jobs-breakdown")).toHaveCount(0);
      await row.getByTestId("working-stylist-toggle").click();
      await expect(page.getByTestId("working-jobs-breakdown")).toBeVisible();
    }
  });

  test("money menu opens store earnings and payroll", async ({ page }) => {
    await adminLogin(page);
    const headerNav = page.locator(".admin-header-nav");
    await headerNav.getByRole("button", { name: /money/i }).click();
    await expect(page.getByRole("menuitem", { name: /store earnings/i })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /^payroll$/i })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /^services$|^products$|^stylists$/i })).toHaveCount(0);
    await page.getByRole("menuitem", { name: /store earnings/i }).click();
    await expect(page).toHaveURL(/\/manager\/earnings/);
  });

  test("services page lists items and sync control", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/manager/services");
    await expect(page.getByRole("heading", { name: /services/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /link all services/i })).toBeVisible();
    await expect(page.getByText(/min/i).first()).toBeVisible();
  });

  test("book for client page loads catalog", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/manager/book");
    await expect(page.getByText(/book|client|service|stylist/i).first()).toBeVisible();
  });

  test("rejects bad password", async ({ page }) => {
    await page.goto("/manager/login");
    await page.getByLabel(/email/i).fill(DEMO.adminEmail);
    await page.getByLabel(/password/i).fill("wrong-password");
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText(/invalid|failed|error/i)).toBeVisible();
  });

  test("account page loads and rejects wrong current password", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/manager/account");
    await expect(page.getByRole("heading", { name: /^profile$/i })).toBeVisible();
    await expect(page.getByTestId("manager-profile-card")).toBeVisible();
    await expect(page.getByTestId("manager-photo-preview")).toBeVisible();
    await expect(page.getByTestId("manager-edit-profile")).toBeVisible();
    await expect(page.getByTestId("manager-photo-button")).toBeVisible();
    await expect(page.getByText(DEMO.adminEmail)).toBeVisible();

    await page.getByLabel(/^current password$/i).fill("wrong-current-password");
    await page.getByLabel(/^new password$/i).fill("NewPassword123!");
    await page.getByLabel(/confirm new password/i).fill("NewPassword123!");
    await page.getByRole("button", { name: /update password/i }).click();
    await expect(page.getByText(/current password is incorrect/i)).toBeVisible();
  });

  test("manager can change password and sign back in", async ({ page }) => {
    // Requires a working admin password in DEMO / E2E_ADMIN_PASSWORD.
    // Changes password then restores the original so other tests keep working.
    const original = DEMO.password;
    const tempPassword = `AdminTmp${Date.now().toString(36)}!`;

    await adminLogin(page);
    await page.goto("/manager/account");
    await page.getByLabel(/^current password$/i).fill(original);
    await page.getByLabel(/^new password$/i).fill(tempPassword);
    await page.getByLabel(/confirm new password/i).fill(tempPassword);
    await page.getByRole("button", { name: /update password/i }).click();
    await expect(page.getByText(/password updated/i)).toBeVisible();

    await page.getByRole("main").getByRole("button", { name: /^log out$/i }).click();
    await page.goto("/manager/login");
    await page.getByLabel(/email/i).fill(DEMO.adminEmail);
    await page.getByLabel(/password/i).fill(tempPassword);
    await page.locator('form button[type="submit"]').click();
    await expect(page).toHaveURL(/\/manager(?!\/login)/, { timeout: 20_000 });

    await page.goto("/manager/account");
    await page.getByLabel(/^current password$/i).fill(tempPassword);
    await page.getByLabel(/^new password$/i).fill(original);
    await page.getByLabel(/confirm new password/i).fill(original);
    await page.getByRole("button", { name: /update password/i }).click();
    await expect(page.getByText(/password updated/i)).toBeVisible();
  });
});
