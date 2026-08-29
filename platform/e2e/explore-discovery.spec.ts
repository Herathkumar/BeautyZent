import { expect, test } from "@playwright/test";

test.describe("marketplace discovery", () => {
  test("searches actual service names and applies price/rewards filters", async ({
    request,
  }) => {
    const serviceSearch = await request.get("/api/public/explore?q=fade");
    expect(serviceSearch.ok()).toBeTruthy();
    const serviceData = await serviceSearch.json();
    expect(serviceData.businesses.length).toBeGreaterThan(0);
    for (const business of serviceData.businesses) {
      expect(
        business.matchedServices.some((service: { name: string }) =>
          service.name.toLowerCase().includes("fade")
        )
      ).toBeTruthy();
    }

    const priced = await request.get("/api/public/explore?maxPrice=25&sort=price");
    expect(priced.ok()).toBeTruthy();
    const pricedData = await priced.json();
    expect(pricedData.businesses.length).toBeGreaterThan(0);
    for (const business of pricedData.businesses) {
      expect(business.minPriceCents).toBeLessThanOrEqual(2_500);
    }

    const rewards = await request.get("/api/public/explore?rewards=1");
    expect(rewards.ok()).toBeTruthy();
    const rewardsData = await rewards.json();
    for (const business of rewardsData.businesses) {
      expect(business.rewards.hasRewards).toBeTruthy();
    }
  });

  test("returns only businesses with a bookable slot for selected date", async ({
    request,
  }) => {
    const nextMonday = new Date();
    const daysUntilMonday = ((8 - nextMonday.getDay()) % 7) || 7;
    nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
    const date = nextMonday.toISOString().slice(0, 10);

    const response = await request.get(
      `/api/public/explore?date=${date}&sort=availability`
    );
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.filters.date).toBe(date);
    for (const business of data.businesses) {
      expect(business.availability?.earliestAt).toBeTruthy();
    }

    const invalid = await request.get("/api/public/explore?date=2026-99-99");
    expect(invalid.status()).toBe(400);
  });

  test("shows expanded discovery controls", async ({ page }) => {
    await page.goto("/explore");
    await expect(page.getByLabel("Business or service")).toBeVisible();
    await expect(page.getByLabel("Location")).toBeVisible();
    await expect(page.getByLabel("Available on")).toBeVisible();
    await expect(page.getByLabel("Max price")).toBeVisible();
    await expect(page.getByLabel("Sort")).toBeVisible();
    await expect(page.getByLabel("Rewards and offers only")).toBeVisible();
  });
});
