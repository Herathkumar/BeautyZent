import { test, expect } from "@playwright/test";
import {
  adminLogin,
  clearOpenBookingsForStylist,
  gotoSettled,
  joinAsMember,
} from "./helpers";

async function enableMemberDiscountRule(page: import("@playwright/test").Page, ruleName: string) {
  await gotoSettled(page, "/manager/pay");
  await page.getByTestId("promo-discounts-enabled").check();
  await page.getByTestId("promo-loyalty-enabled").check();
  const saveSettings = page.waitForResponse(
    (r) => r.url().includes("/api/admin/promotions") && r.request().method() === "POST"
  );
  await page.getByRole("button", { name: /save promotion settings/i }).click();
  const settingsRes = await saveSettings;
  expect(settingsRes.ok(), await settingsRes.text()).toBeTruthy();

  await page.getByTestId("promotion-rule-form").scrollIntoViewIfNeeded();
  await page.getByLabel(/label \(shown at checkout\)/i).fill(ruleName);
  const addRule = page.waitForResponse(
    (r) => r.url().includes("/api/admin/promotions") && r.request().method() === "POST"
  );
  await page.getByRole("button", { name: /^add rule$/i }).click();
  const ruleRes = await addRule;
  expect(ruleRes.ok(), await ruleRes.text()).toBeTruthy();
}

test.describe("Checkout promotions", () => {
  test("member discount auto-applies at reception checkout", async ({ page }) => {
    test.setTimeout(180_000);
    const stamp = Date.now();
    const clientName = `Promo Member ${stamp}`;
    const phone = `416${String(stamp).slice(-7)}`;
    const email = `promo.member.${stamp}@example.com`;
    const ruleName = `E2E Member 10% ${stamp}`;

    await adminLogin(page);
    await enableMemberDiscountRule(page, ruleName);

    await joinAsMember(page, { name: clientName, phone, email });

    await adminLogin(page);
    await clearOpenBookingsForStylist(page, /^(aisha|omar|farzana)$/i);
    await page.request.post("/api/display/fhsalon/checkout", { data: { action: "cancel" } }).catch(() => undefined);

    const catalog = await page.request.get("/api/public/fhsalon/catalog");
    expect(catalog.ok()).toBeTruthy();
    const cat = await catalog.json();
    const service =
      (cat.services || []).find((s: { name: string }) => /beard tidy/i.test(s.name)) ||
      (cat.services || []).find((s: { name: string }) => /\bmen'?s haircut\b/i.test(s.name));
    const omar = (cat.stylists || []).find((s: { name: string }) => /omar/i.test(s.name));
    expect(service?.id).toBeTruthy();
    expect(omar?.id).toBeTruthy();
    expect(service.priceCents).toBeGreaterThan(0);

    const walk = await page.request.post("/api/admin/walk-in", {
      data: {
        serviceId: service.id,
        stylistId: omar.id,
        nextAvailable: true,
        clientName,
        clientPhone: phone,
      },
    });
    expect(walk.ok(), `walk-in create: ${await walk.text()}`).toBeTruthy();

    await page.goto("/display/fhsalon/reception");
    const row = page.locator("article").filter({ hasText: clientName }).first();
    await expect(row).toBeVisible({ timeout: 40_000 });
    await row.click();

    const panel = page.getByTestId("reception-client-panel");
    await expect(panel).toContainText(clientName);
    await panel.getByRole("button", { name: /^checkout$/i }).click();

    const desk = page.getByTestId("reception-checkout-desk");
    await expect(desk).toBeVisible({ timeout: 10_000 });

    const discount = desk.getByTestId("reception-checkout-discount");
    await expect(discount).toBeVisible();
    await expect(discount).toContainText(ruleName);
    const expectedDiscountCents = Math.floor((service.priceCents * 1000) / 10_000);
    const formattedDiscount = new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(expectedDiscountCents / 100);
    await expect(discount).toContainText(formattedDiscount);
    await expect(desk.getByTestId("reception-loyalty-earn")).toBeVisible();
  });
});
