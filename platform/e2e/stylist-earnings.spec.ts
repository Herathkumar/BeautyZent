import { test, expect } from "@playwright/test";
import { stylistLogin } from "./helpers";

test.describe("Stylist earnings", () => {
  test("earnings page loads with week nav and totals", async ({ page }) => {
    await stylistLogin(page);
    await page.getByRole("link", { name: /^earnings$/i }).click();
    await expect(page.getByRole("heading", { name: /^earnings$/i })).toBeVisible();
    await expect(page.getByText(/week total/i)).toBeVisible();
    await expect(page.getByText(/^paid$/i).first()).toBeVisible();
    await expect(page.getByText(/^pending$/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /previous week/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /next week/i })).toBeVisible();
    await page.getByRole("button", { name: /previous week/i }).click();
    await expect(page.getByText(/week of|this week/i).first()).toBeVisible();
  });
});
