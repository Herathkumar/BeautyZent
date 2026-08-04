import { test, expect } from "@playwright/test";
import { stylistLogin, toLocalDateTimeInput } from "./helpers";

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

    await expect(page.getByText(/marked away|updated/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/E2E lunch break/i)).toBeVisible();

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
