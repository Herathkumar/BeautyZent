import { expect, test } from "@playwright/test";
import { gotoSettled } from "./helpers";
import { platformLogin } from "./multi-salon/helpers";

/**
 * Claim → platform review → Explore publish/pause.
 * Covers the marketplace onboarding path that was previously untested.
 */
test.describe("marketplace claim & listing review", () => {
  test("claims a business, approves it, then pauses the Explore listing", async ({
    page,
  }) => {
    const stamp = `${Date.now()}`;
    const slug = `qa-claim-${stamp}`.slice(0, 40);
    const businessName = `QA Claim Salon ${stamp.slice(-6)}`;
    const managerEmail = `manager-${stamp}@claim.test`;

    await gotoSettled(page, "/claim");
    await expect(page.getByRole("heading", { name: /grow with ease/i })).toBeVisible();

    await page.getByLabel(/^business name$/i).fill(businessName);
    await page.getByLabel(/booking url slug/i).fill(slug);
    await page.getByLabel(/^city$/i).fill("Dundas");
    await page.getByLabel(/^region$/i).fill("ON");
    await page.getByLabel(/short description/i).fill("E2E claim listing for BeautyZent QA.");
    await page.getByLabel(/^your name$/i).fill("Claim Manager");
    await page.getByLabel(/work email/i).fill(managerEmail);
    await page.getByLabel(/password \(min 8\)/i).fill("demo1234");

    await page.getByRole("button", { name: /submit for review/i }).click();
    await expect(page.getByRole("heading", { name: /you.?re in review/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(businessName)).toBeVisible();

    const exploreQuery = encodeURIComponent(businessName);

    // Draft + paused — should not appear in public Explore API yet.
    const before = await page.request.get(`/api/public/explore?q=${exploreQuery}`);
    expect(before.ok()).toBeTruthy();
    const beforeData = await before.json();
    expect(
      (beforeData.businesses || []).some((b: { slug: string }) => b.slug === slug)
    ).toBeFalsy();

    await platformLogin(page);
    const card = page.locator("article").filter({ hasText: businessName });
    await expect(card).toBeVisible({ timeout: 20_000 });
    await expect(card.getByText(/DRAFT/i)).toBeVisible();
    await card.getByRole("link", { name: /^preview$/i }).click();

    await expect(page.getByRole("heading", { name: /onboarding preview/i })).toBeVisible();
    await page.getByTestId("listing-approve").click();
    await expect(page.getByRole("button", { name: /pause listing/i })).toBeVisible({
      timeout: 20_000,
    });

    const after = await page.request.get(`/api/public/explore?q=${exploreQuery}`);
    expect(after.ok()).toBeTruthy();
    const afterData = await after.json();
    expect(
      (afterData.businesses || []).some((b: { slug: string }) => b.slug === slug)
    ).toBeTruthy();

    await gotoSettled(page, `/explore/${slug}`);
    await expect(page.getByRole("heading", { name: businessName })).toBeVisible();
    await expect(page.getByRole("link", { name: /book a visit/i }).first()).toBeVisible();

    // Return to preview to pause the published listing.
    await platformLogin(page);
    await page
      .locator("article")
      .filter({ hasText: businessName })
      .getByRole("link", { name: /^preview$/i })
      .click();
    await page.getByRole("button", { name: /pause listing/i }).click();
    await expect(page.getByRole("button", { name: /resume listing/i })).toBeVisible({
      timeout: 20_000,
    });

    const paused = await page.request.get(`/api/public/explore?q=${exploreQuery}`);
    expect(paused.ok()).toBeTruthy();
    const pausedData = await paused.json();
    expect(
      (pausedData.businesses || []).some((b: { slug: string }) => b.slug === slug)
    ).toBeFalsy();
  });
});
