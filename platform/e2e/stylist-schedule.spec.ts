import { test, expect } from "@playwright/test";
import { adminLogin, DEMO, stylistLogin, toLocalDateTimeInput } from "./helpers";

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

    const leaveForm = page.locator("form").filter({ has: page.getByRole("button", { name: /mark me away/i }) });
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

  test("manager can approve leave from dashboard; stylist sees Approved", async ({ page }) => {
    const note = `E2E approve ${Date.now()}`;
    // Aisha is not self-manage — leave stays PENDING until manager approves
    await page.goto("/stylist/login");
    await page.getByLabel(/email/i).fill("aisha@fhsalon.ca");
    await page.getByLabel(/password/i).fill(DEMO.password);
    await page.locator('form button[type="submit"]').click();
    await expect(page).toHaveURL(/\/stylist(?!\/login)/, { timeout: 20_000 });
    await page.goto("/stylist/schedule");

    const start = new Date();
    start.setDate(start.getDate() + 25);
    start.setHours(14, 0, 0, 0);
    const end = new Date(start);
    end.setHours(16, 0, 0, 0);

    const leaveForm = page.locator("form").filter({ has: page.getByRole("button", { name: /mark me away/i }) });
    await leaveForm.locator('input[type="datetime-local"]').nth(0).fill(toLocalDateTimeInput(start));
    await leaveForm.locator('input[type="datetime-local"]').nth(1).fill(toLocalDateTimeInput(end));
    await leaveForm.locator("select").selectOption("LEAVE");
    await leaveForm.getByPlaceholder(/lunch|dentist|optional/i).fill(note);
    await leaveForm.getByRole("button", { name: /mark me away/i }).click();
    await expect(page.getByText(note)).toBeVisible({ timeout: 10_000 });
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

    await page.goto("/stylist/login");
    await page.getByLabel(/email/i).fill("aisha@fhsalon.ca");
    await page.getByLabel(/password/i).fill(DEMO.password);
    await page.locator('form button[type="submit"]').click();
    await expect(page).toHaveURL(/\/stylist(?!\/login)/, { timeout: 20_000 });
    await page.goto("/stylist/schedule");
    await expect(page.getByText(note)).toBeVisible({ timeout: 10_000 });
    await expect(
      page.locator("div").filter({ hasText: note }).getByText(/^approved$/i)
    ).toBeVisible();

    page.once("dialog", (d) => d.accept());
    await page
      .locator("div")
      .filter({ hasText: note })
      .getByRole("button", { name: /^remove$/i })
      .first()
      .click();
  });

  test("can save work days", async ({ page }) => {
    await stylistLogin(page);
    await page.goto("/stylist/schedule");
    await expect(page.getByRole("heading", { name: "Schedule" })).toBeVisible();
    await page.getByRole("button", { name: /save work days/i }).click();
    await expect(page.getByText(/saved|clients only see/i)).toBeVisible({ timeout: 10_000 });
  });
});
