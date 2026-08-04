import { test, expect } from "@playwright/test";
import { adminLogin, stylistLogin } from "./helpers";

test.describe("Walk-in appointments", () => {
  test("manager can seat a walk-in and filter by source", async ({ page }) => {
    const clientName = `WalkInMgr ${Date.now()}`;

    await adminLogin(page);
    await page.goto("/manager/walk-in");
    await expect(page.getByRole("heading", { name: /^walk-in$/i })).toBeVisible();
    await expect(page.getByTestId("walk-in-panel")).toBeVisible();

    await page.getByLabel("Walk-in service").selectOption({ index: 1 });
    await expect(page.getByTestId("walk-in-eta")).toBeVisible({ timeout: 10_000 });
    await page.getByLabel("Walk-in client name").fill(clientName);
    await page.getByRole("button", { name: /seat walk-in/i }).click();

    await expect(page.getByText(/walk-in seated/i)).toBeVisible({ timeout: 15_000 });

    await page.goto("/manager/appointments");
    await expect(page.getByRole("heading", { name: /^bookings$/i })).toBeVisible();
    await page.getByLabel("Source").selectOption("WALK_IN");
    await expect(page.getByText(clientName).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("walk-in-badge").first()).toBeVisible();
  });

  test("manager can add guest to waitlist", async ({ page }) => {
    const clientName = `Waitlist ${Date.now()}`;

    await adminLogin(page);
    await page.goto("/manager/walk-in");
    await page.getByLabel("Walk-in service").selectOption({ index: 1 });
    await page.getByLabel("Walk-in client name").fill(clientName);
    await page.getByRole("button", { name: /add to waitlist/i }).click();

    await expect(page.getByText(/added to waitlist/i)).toBeVisible({ timeout: 15_000 });
    const waitlist = page.getByTestId("walk-in-waitlist");
    await expect(waitlist.getByText(clientName)).toBeVisible();
    await expect(waitlist.getByText(/ready now|min wait|h /i).first()).toBeVisible();
  });

  test("stylist can seat a walk-in for self", async ({ page }) => {
    const clientName = `WalkInSty ${Date.now()}`;

    await stylistLogin(page);
    await page.goto("/stylist");
    await page.getByTestId("stylist-walk-in-toggle").click();
    await expect(page.getByTestId("walk-in-panel")).toBeVisible();

    await page.getByLabel("Walk-in service").selectOption({ index: 1 });
    await page.getByLabel("Walk-in client name").fill(clientName);
    await page.getByRole("button", { name: /seat walk-in/i }).click();

    await expect(page.getByText(/walk-in seated/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(clientName).first()).toBeVisible({ timeout: 10_000 });
  });

  test("display board walk-in desk opens", async ({ page }) => {
    await page.goto("/display/fhsalon");
    await expect(page.getByRole("heading", { name: /walk-in desk/i })).toBeVisible();
    await page.getByTestId("display-walk-in-toggle").click();
    await expect(page.getByTestId("walk-in-panel")).toBeVisible();
    await expect(page.getByTestId("walk-in-waitlist")).toBeVisible();
  });
});
