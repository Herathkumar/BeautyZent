import { test, expect } from "@playwright/test";
import { managerLogin, stylistLogin } from "./helpers";
import { OTHER, TENANTS } from "./tenants";

test.describe("Tenant isolation", () => {
  for (const tenant of TENANTS) {
    const other = OTHER[tenant.id];

    test(`${tenant.slug} public catalog is not ${other.slug}`, async ({ page }) => {
      const mine = await page.request.get(`/api/public/${tenant.slug}/catalog`);
      const theirs = await page.request.get(`/api/public/${other.slug}/catalog`);
      expect(mine.ok(), await mine.text()).toBeTruthy();
      expect(theirs.ok(), await theirs.text()).toBeTruthy();
      const a = await mine.json();
      const b = await theirs.json();
      expect(a.salon?.slug || a.salon?.name).toBeTruthy();
      const myNames: string[] = (a.stylists || []).map((s: { name: string }) => s.name);
      const theirNames: string[] = (b.stylists || []).map((s: { name: string }) => s.name);
      expect(myNames.some((n) => new RegExp(tenant.stylistName, "i").test(n))).toBeTruthy();
      expect(myNames.some((n) => new RegExp(`^${other.stylistName}$`, "i").test(n))).toBeFalsy();
      expect(theirNames.some((n) => new RegExp(other.stylistName, "i").test(n))).toBeTruthy();
      const myServices = (a.services || []).map((s: { name: string }) => s.name).join("|");
      expect(myServices).toMatch(tenant.servicePattern);
    });

    test(`${tenant.slug} manager session cannot read the other salon catalog as own`, async ({
      page,
    }) => {
      await managerLogin(page, tenant);
      const salon = await page.request.get("/api/admin/salon");
      expect(salon.ok()).toBeTruthy();
      const data = await salon.json();
      expect(data.salon?.slug).toBe(tenant.slug);
      expect(data.salon?.name).toMatch(new RegExp(tenant.name, "i"));

      const stylists = await page.request.get("/api/admin/stylists");
      const json = await stylists.json();
      const names = (json.stylists || []).map((s: { name: string }) => s.name).join(",");
      expect(names).toMatch(new RegExp(tenant.stylistName, "i"));
      expect(names).not.toMatch(new RegExp(other.stylistName, "i"));
    });

    test(`${tenant.slug} stylist login brands this salon, not ${other.slug}`, async ({ page }) => {
      await stylistLogin(page, tenant);
      await expect(page.getByRole("link", { name: tenant.name })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(other.name)).toHaveCount(0);
    });
  }

  test("wrong-salon staff email is rejected on the other login", async ({ page }) => {
    const [fh, demo] = TENANTS;
    await page.goto(`/stylist/login?salon=${demo.slug}`);
    await page.getByLabel(/^email$/i).fill(fh.stylistEmail);
    await page.getByLabel(/^password$/i).fill(fh.password);
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText(/not for .+|different salon|invalid credentials/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).toHaveURL(/\/stylist\/login/);
  });
});
