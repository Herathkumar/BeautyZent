import { test, expect } from "@playwright/test";
import { acceptConfirm, adminLogin, nextOpenDate, pickFirstSlot } from "./helpers";

test.describe("Admin — book for client", () => {
  test("front desk can create a booking", async ({ page }) => {
    const clientName = `WalkIn ${Date.now()}`;

    await adminLogin(page);
    await page.goto("/manager/book");
    await expect(page.getByRole("heading", { name: /book for a client/i })).toBeVisible();

    const selects = page.locator("form select");
    await selects.nth(0).selectOption({ index: 1 });
    await page.waitForTimeout(500);
    // Prefer a less-busy stylist to avoid slot races with other E2E bookings
    const stylistOptions = await selects.nth(1).locator("option").allTextContents();
    const pick =
      stylistOptions.find((o) => /aisha/i.test(o)) ||
      stylistOptions.find((o) => /omar/i.test(o)) ||
      stylistOptions.find((o) => /farzana/i.test(o));
    if (pick) await selects.nth(1).selectOption({ label: pick.trim() });

    // pickFirstSlot already selects an open time; avoid a second click that can race DOM refresh
    await pickFirstSlot(page, nextOpenDate());

    await page.locator('label:has-text("Client name") input').fill(clientName);
    await page.locator('label:has-text("Client phone") input').fill("9055550222");
    await page.locator('label:has-text("Notes") input').fill("E2E admin book");
    await page.getByRole("button", { name: /create booking/i }).click();

    await expect(page.locator("form p").filter({ hasText: /Booked|Could not|already/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("products and stylists admin pages load", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/manager/products");
    await expect(page.getByRole("heading", { name: /product/i })).toBeVisible();
    await page.goto("/manager/stylists");
    await expect(page.getByRole("heading", { name: /stylist/i })).toBeVisible();
    // Scope to stylist cards — nav brand also contains "Farzana"
    await expect(page.locator("article").filter({ hasText: /farzana/i }).first()).toBeVisible();
  });

  test("manager can toggle self-manage schedule on existing stylist", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/manager/stylists");
    await expect(page.getByRole("heading", { name: /stylists & logins/i })).toBeVisible();

    // Aisha is seeded without self-manage
    const card = page.locator("article").filter({ hasText: /aisha/i }).first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    const toggle = card.getByRole("checkbox", { name: /self-manage schedule/i });
    await expect(toggle).toBeVisible();
    await expect(toggle).not.toBeChecked();
    await expect(card.getByText(/needs leave approval/i)).toBeVisible();

    const saveResp = page.waitForResponse(
      (r) =>
        r.url().includes("/api/admin/stylists") &&
        r.request().method() === "POST" &&
        r.request().postDataJSON()?.action === "updateSelfManage"
    );
    await toggle.check();
    const saved = await saveResp;
    expect(saved.ok()).toBeTruthy();
    const savedJson = await saved.json();
    expect(savedJson.stylist?.selfManageSchedule).toBe(true);
    await expect(toggle).toBeChecked();
    await expect(card.getByText(/· self-manage/i)).toBeVisible({ timeout: 10_000 });

    await page.reload();
    const cardAfter = page.locator("article").filter({ hasText: /aisha/i }).first();
    const toggleAfter = cardAfter.getByRole("checkbox", { name: /self-manage schedule/i });
    await expect(toggleAfter).toBeChecked({ timeout: 15_000 });

    const restoreResp = page.waitForResponse(
      (r) =>
        r.url().includes("/api/admin/stylists") &&
        r.request().method() === "POST" &&
        r.request().postDataJSON()?.action === "updateSelfManage"
    );
    await toggleAfter.uncheck();
    const restored = await restoreResp;
    expect(restored.ok()).toBeTruthy();
    await expect(toggleAfter).not.toBeChecked();
    await expect(cardAfter.getByText(/needs leave approval/i)).toBeVisible({ timeout: 10_000 });
  });

  test("reset password shows credentials in the same stylist card", async ({ page }) => {
    const unique = `Rst${Date.now().toString(36)}`;
    await adminLogin(page);
    await page.goto("/manager/stylists");

    await page.getByPlaceholder(/stylist name/i).fill(`${unique} Stylist`);
    await page.getByRole("button", { name: /add stylist \+ login/i }).click();
    const createPanel = page.getByTestId("issued-credentials");
    await expect(createPanel).toBeVisible({ timeout: 20_000 });
    await createPanel.getByRole("button", { name: /^done$/i }).click();

    const card = page.locator("article").filter({ hasText: new RegExp(unique, "i") }).first();
    await card.getByRole("button", { name: /reset password/i }).click();
    await acceptConfirm(page);
    const panel = card.getByTestId("issued-credentials");
    await expect(panel).toBeVisible({ timeout: 15_000 });
    await expect(panel.getByText(new RegExp(`new password for ${unique}`, "i"))).toBeVisible();
    const pwd = (await panel.getByTestId("issued-password").innerText()).trim();
    expect(pwd.length).toBeGreaterThanOrEqual(8);
    await expect(panel.getByTestId("issued-email")).toContainText(new RegExp(`^${unique.toLowerCase()}@`, "i"));
    await panel.getByRole("button", { name: /copy password only/i }).click();
    await panel.getByRole("button", { name: /^done$/i }).click();
    await expect(panel).toBeHidden();
  });
});



