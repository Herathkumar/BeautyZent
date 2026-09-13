import { expect, test } from "@playwright/test";
import { adminLogin, gotoSettled } from "./helpers";

test.describe("manager stylist schedule", () => {
  test("opens Manage schedule and can add a leave block", async ({ page }) => {
    await adminLogin(page);
    await gotoSettled(page, "/manager/stylists");
    await expect(page.getByTestId("stylist-card").first()).toBeVisible({ timeout: 20_000 });

    const card = page
      .getByTestId("stylist-card")
      .filter({ hasText: /farzana/i })
      .first();
    await expect(card).toBeVisible();
    await card.getByRole("link", { name: /manage schedule/i }).click();

    await expect(page).toHaveURL(new RegExp(`/manager/stylists/.+/schedule`));
    await expect(
      page.getByRole("heading", { name: /schedule|farzana/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /leave & blocked time/i })).toBeVisible();

    const start = page.locator('input[type="datetime-local"]').nth(0);
    const end = page.locator('input[type="datetime-local"]').nth(1);
    await expect(start).toBeVisible();

    // Far-future Sunday block so we do not collide with live booking e2e.
    const startAt = "2030-01-06T10:00";
    const endAt = "2030-01-06T12:00";
    for (const [locator, value] of [
      [start, startAt],
      [end, endAt],
    ] as const) {
      await locator.evaluate((el, v) => {
        const input = el as HTMLInputElement;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        setter?.call(input, v);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }, value);
    }
    await page.getByRole("button", { name: /add leave \/ block/i }).click();

    await expect(
      page.getByText(/leave \/ block added|leave approved|saved|updated/i).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("stylist disable control is available on stylists page", async ({ page }) => {
    await adminLogin(page);
    await gotoSettled(page, "/manager/stylists");
    const card = page.getByTestId("stylist-card").filter({ hasText: /aisha|omar/i }).first();
    await expect(card).toBeVisible({ timeout: 20_000 });
    // Seeded secondary stylists expose disable; assert the control exists without mutating.
    await expect(
      card.getByTestId("stylist-disable").or(card.getByTestId("stylist-enable"))
    ).toBeVisible();
  });
});
