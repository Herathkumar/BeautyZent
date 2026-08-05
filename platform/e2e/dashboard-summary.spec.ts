import { test, expect } from "@playwright/test";
import { adminLogin } from "./helpers";

test.describe("Manager dashboard summaries", () => {
  test("store earnings card shows daily goal ring", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/manager");
    const card = page.getByTestId("dashboard-store-earnings");
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card.getByTestId("dashboard-daily-goal-ring")).toBeVisible();
    await expect(card.getByText(/today.*profit/i)).toBeVisible();
    await expect(card.getByText(/daily goal|goal reached/i)).toBeVisible();
    await expect(card.getByText(/this week.*profit/i)).toBeVisible();
  });

  test("today bookings card summarizes online, walk-in, waitlist", async ({ page }) => {
    await adminLogin(page);

    const catalog = await page.request.get("/api/public/fhsalon/catalog");
    const cat = await catalog.json();
    const service = (cat.services || []).find((s: { name: string }) =>
      /^men.?s haircut/i.test(s.name)
    );
    expect(service?.id).toBeTruthy();

    const waitName = `DashWait ${Date.now()}`;
    const add = await page.request.post("/api/admin/waitlist", {
      data: { clientName: waitName, serviceId: service.id },
    });
    expect(add.ok()).toBeTruthy();

    await page.goto("/manager");
    const card = page.getByTestId("dashboard-todays-bookings");
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card.getByText(/today.?s bookings/i)).toBeVisible();
    await expect(card.getByText("Online", { exact: true })).toBeVisible();
    await expect(card.getByText("Walk-in", { exact: true })).toBeVisible();
    await expect(card.getByText("Waitlist", { exact: true })).toBeVisible();
    // Waitlist count should be at least 1 after we added a guest
    const waitRow = card.locator("li").filter({ hasText: /waitlist/i });
    await expect(waitRow).toBeVisible();
    const waitCount = Number((await waitRow.locator("span").last().textContent())?.trim());
    expect(waitCount).toBeGreaterThanOrEqual(1);
  });
});

test.describe("Display waitlist placement", () => {
  test("waitlist sits under welcome card on Today", async ({ page }) => {
    await page.goto("/display/fhsalon");
    await page.getByRole("button", { name: /^today/i }).click();

    const welcome = page.getByRole("heading", { name: /^book online$/i });
    const waitlist = page.getByTestId("display-waitlist-section");
    await expect(welcome).toBeVisible();
    await expect(waitlist).toBeVisible();

    const welcomeBox = await welcome.boundingBox();
    const waitBox = await waitlist.boundingBox();
    expect(welcomeBox && waitBox).toBeTruthy();
    expect(waitBox!.y).toBeGreaterThan(welcomeBox!.y);
  });

  test("welcome card shows separate walk-in waitlist count", async ({ page }) => {
    await adminLogin(page);
    const catalog = await page.request.get("/api/public/fhsalon/catalog");
    const cat = await catalog.json();
    const service = (cat.services || []).find((s: { name: string }) =>
      /^men.?s haircut/i.test(s.name)
    );
    expect(service?.id).toBeTruthy();

    const waitName = `FloorWait ${Date.now()}`;
    const add = await page.request.post("/api/admin/waitlist", {
      data: { clientName: waitName, serviceId: service.id },
    });
    expect(add.ok()).toBeTruthy();

    await page.goto("/display/fhsalon");
    await page.getByRole("button", { name: /^today/i }).click();

    const counts = page.getByTestId("display-floor-counts");
    await expect(counts).toBeVisible({ timeout: 15_000 });
    await expect(counts.getByText(/^online$/i)).toBeVisible();
    await expect(counts.getByText(/^walk-in$/i)).toBeVisible();
    await expect(counts.getByText(/^in chair$/i)).toBeVisible();

    await expect(page.getByText(waitName)).toBeVisible({ timeout: 15_000 });
    const walkInCount = Number(
      (await page.getByTestId("display-count-walk-in").textContent())?.trim()
    );
    expect(walkInCount).toBeGreaterThanOrEqual(1);
  });
});
