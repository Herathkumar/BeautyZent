import { test, expect, type Page } from "@playwright/test";
import { adminLogin, DEMO, stylistLogin, toLocalDateTimeInput } from "./helpers";

async function loginAsAisha(page: Page) {
  await page.goto("/stylist/login");
  await page.getByLabel(/email/i).fill("aisha@fhsalon.ca");
  await page.getByLabel(/password/i).fill(DEMO.password);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/stylist(?!\/login)/, { timeout: 20_000 });
}

async function setAishaSelfManage(page: Page, enabled: boolean) {
  await adminLogin(page);
  await page.goto("/manager/stylists");
  const card = page.locator("article").filter({ hasText: /aisha/i }).first();
  await expect(card).toBeVisible({ timeout: 15_000 });
  const toggle = card.getByRole("checkbox", { name: /self-manage schedule/i });
  const checked = await toggle.isChecked();
  if (checked === enabled) return;

  const saveResp = page.waitForResponse(
    (r) =>
      r.url().includes("/api/admin/stylists") &&
      r.request().method() === "POST" &&
      r.request().postDataJSON()?.action === "updateSelfManage"
  );
  if (enabled) await toggle.check();
  else await toggle.uncheck();
  const saved = await saveResp;
  expect(saved.ok()).toBeTruthy();
  if (enabled) await expect(toggle).toBeChecked();
  else await expect(toggle).not.toBeChecked();
}

async function openAwayForm(page: Page) {
  const markAway = page.getByRole("button", { name: /mark me away/i });
  if (await markAway.count()) return;
  await page.getByRole("button", { name: /manual times/i }).click();
  await expect(page.getByRole("button", { name: /mark me away/i })).toBeVisible();
}

async function requestLeave(page: Page, note: string, daysAhead: number) {
  await page.goto("/stylist/schedule");
  await openAwayForm(page);
  const start = new Date();
  start.setDate(start.getDate() + daysAhead);
  start.setHours(14, 0, 0, 0);
  const end = new Date(start);
  end.setHours(16, 0, 0, 0);

  const leaveForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: /mark me away/i }) });
  await leaveForm.locator('input[type="datetime-local"]').nth(0).fill(toLocalDateTimeInput(start));
  await leaveForm.locator('input[type="datetime-local"]').nth(1).fill(toLocalDateTimeInput(end));
  await leaveForm.locator("select").selectOption("LEAVE");
  await leaveForm.getByPlaceholder(/lunch|dentist|optional/i).fill(note);
  await leaveForm.getByRole("button", { name: /mark me away/i }).click();
  await expect(page.getByText(note)).toBeVisible({ timeout: 10_000 });
}

async function removeLeaveByNote(page: Page, note: string) {
  page.once("dialog", (d) => d.accept());
  await page
    .locator("div")
    .filter({ hasText: note })
    .getByRole("button", { name: /^remove$/i })
    .first()
    .click();
  await expect(page.getByText(note)).toHaveCount(0, { timeout: 10_000 });
}

test.describe("Stylist — schedule & leave", () => {
  test("can mark away and remove it", async ({ page }) => {
    await stylistLogin(page);
    await page.getByRole("link", { name: /^schedule$/i }).click();
    await expect(page.getByRole("heading", { name: "Schedule" })).toBeVisible();

    const start = new Date();
    start.setDate(start.getDate() + 20);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start);
    end.setHours(12, 0, 0, 0);

    await openAwayForm(page);
    const leaveForm = page
      .locator("form")
      .filter({ has: page.getByRole("button", { name: /mark me away/i }) });
    await leaveForm.locator('input[type="datetime-local"]').nth(0).fill(toLocalDateTimeInput(start));
    await leaveForm.locator('input[type="datetime-local"]').nth(1).fill(toLocalDateTimeInput(end));
    await leaveForm.locator("select").selectOption("BREAK");
    await leaveForm.getByPlaceholder(/lunch|dentist|optional/i).fill("E2E lunch break");
    await leaveForm.getByRole("button", { name: /mark me away/i }).click();

    await expect(
      page.getByText(/marked away|updated|waiting for admin|awaiting approval/i)
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/E2E lunch break/i)).toBeVisible();
    await expect(page.getByText(/awaiting approval|approved/i).first()).toBeVisible();

    page.once("dialog", (d) => d.accept());
    await page
      .locator("div.space-y-3, div")
      .filter({ hasText: "E2E lunch break" })
      .getByRole("button", { name: /^remove$/i })
      .first()
      .click();

    await expect(page.getByText(/E2E lunch break/i)).toHaveCount(0, { timeout: 10_000 });
  });

  test("can save work days", async ({ page }) => {
    await stylistLogin(page);
    await page.goto("/stylist/schedule");
    await expect(page.getByRole("heading", { name: "Schedule" })).toBeVisible();
    await page.getByRole("button", { name: /save work days/i }).click();
    await expect(page.getByText(/saved|clients only see/i)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Leave approval — self-manage on vs off", () => {
  test("unchecked: leave stays pending until manager approves", async ({ page }) => {
    const note = `E2E needs-approval ${Date.now()}`;

    await setAishaSelfManage(page, false);
    await loginAsAisha(page);
    await requestLeave(page, note, 26);

    await expect(page.getByText(/waiting for admin approval/i)).toBeVisible({ timeout: 10_000 });
    await expect(
      page.locator("div").filter({ hasText: note }).getByText(/awaiting approval/i)
    ).toBeVisible();

    await adminLogin(page);
    await page.goto("/manager");
    const panel = page.getByTestId("pending-leave-panel");
    await expect(panel).toBeVisible({ timeout: 15_000 });
    await expect(panel.getByText(/leave request from/i)).toBeVisible();
    await expect(panel.getByText(/aisha/i)).toBeVisible();
    await expect(panel.getByText(note)).toBeVisible();

    await panel
      .locator("div")
      .filter({ hasText: note })
      .getByRole("button", { name: /^approve$/i })
      .click();
    await expect(page.getByText(/leave approved/i)).toBeVisible({ timeout: 10_000 });
    await expect(panel.getByText(note)).toHaveCount(0, { timeout: 10_000 });

    await loginAsAisha(page);
    await page.goto("/stylist/schedule");
    await expect(page.getByText(note)).toBeVisible({ timeout: 10_000 });
    await expect(
      page.locator("div").filter({ hasText: note }).getByText(/^approved$/i)
    ).toBeVisible();

    await removeLeaveByNote(page, note);
  });

  test("checked: leave auto-approves and skips manager pending list", async ({ page }) => {
    const note = `E2E self-manage ${Date.now()}`;

    await setAishaSelfManage(page, true);
    await loginAsAisha(page);
    await requestLeave(page, note, 27);

    await expect(page.getByText(/marked away|those times are hidden/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.locator("div").filter({ hasText: note }).getByText(/^approved$/i)
    ).toBeVisible();
    await expect(
      page.locator("div").filter({ hasText: note }).getByText(/awaiting approval/i)
    ).toHaveCount(0);

    await adminLogin(page);
    await page.goto("/manager");
    // Give the dashboard a moment to load leave requests
    await page.waitForTimeout(800);
    const panel = page.getByTestId("pending-leave-panel");
    if (await panel.count()) {
      await expect(panel.getByText(note)).toHaveCount(0);
    }

    await loginAsAisha(page);
    await page.goto("/stylist/schedule");
    await expect(
      page.locator("div").filter({ hasText: note }).getByText(/^approved$/i)
    ).toBeVisible({ timeout: 10_000 });
    await removeLeaveByNote(page, note);

    // Restore seed default for Aisha
    await setAishaSelfManage(page, false);
  });
});
