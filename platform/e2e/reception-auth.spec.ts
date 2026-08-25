import { test, expect } from "@playwright/test";
import { clearAuthSession, DEMO, receptionLogin } from "./helpers";

test.describe("Reception login and theme", () => {
  test("unsigned visitors see the reception login", async ({ page }) => {
    await clearAuthSession(page);
    await page.goto(`/display/${DEMO.slug}/reception`);
    await expect(page.getByTestId("reception-login")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("store-display-board")).toHaveCount(0);
  });

  test("manager can sign in, switch theme, and sign out", async ({ page }) => {
    await clearAuthSession(page);
    await page.goto(`/display/${DEMO.slug}/reception`);
    await expect(page.getByTestId("reception-login")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("reception-login-email").fill(DEMO.adminEmail);
    await page.getByTestId("reception-login-password").fill(DEMO.password);
    await page.getByTestId("reception-login-submit").click();
    await expect(page.getByTestId("store-display-board")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("reception-signed-in-name")).toBeVisible();
    await expect(page.getByTestId("reception-signed-in-as")).toHaveText(/logged in as reception/i);
    await expect(page.getByTestId("reception-theme-toggle")).toBeVisible();
    await expect(page.getByTestId("reception-salon-name")).toHaveText(/farzana hair salon/i);
    await expect(page.getByTestId("reception-new-booking")).toBeVisible();

    await page.getByTestId("reception-theme-light").click();
    await expect(page.locator(".reception-board")).toHaveAttribute(
      "data-reception-theme",
      "light"
    );

    await page.getByTestId("reception-theme-dark").click();
    await expect(page.locator(".reception-board")).toHaveAttribute(
      "data-reception-theme",
      "dark"
    );

    await page.getByTestId("reception-sign-out").click();
    await expect(page.getByTestId("reception-login")).toBeVisible({ timeout: 15_000 });
  });

  test("session opens the board without the PIN pad", async ({ page }) => {
    test.setTimeout(180_000);
    await receptionLogin(page);
    await expect(page.getByTestId("display-pin-pad")).toHaveCount(0);
    await expect(page.getByTestId("reception-client-panel")).toBeVisible();
  });

  test("stylist can sign in and is shown as reception", async ({ page }) => {
    await clearAuthSession(page);
    await page.goto(`/display/${DEMO.slug}/reception`);
    await expect(page.getByTestId("reception-login")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("reception-login-email").fill(DEMO.stylistEmail);
    await page.getByTestId("reception-login-password").fill(DEMO.password);
    await page.getByTestId("reception-login-submit").click();
    await expect(page.getByTestId("store-display-board")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("reception-signed-in-name")).toContainText(/farzana/i);
    await expect(page.getByTestId("reception-signed-in-as")).toHaveText(/logged in as reception/i);
    await expect(page.getByTestId("reception-signed-in")).toContainText(/stylist/i);
  });

  test("sidebar menus open clients, staff, services, and reports", async ({ page }) => {
    test.setTimeout(180_000);
    await receptionLogin(page);
    await page.getByTestId("reception-nav-clients").click();
    await expect(page.getByTestId("reception-clients-view")).toBeVisible();
    await page.getByTestId("reception-nav-staff").click();
    await expect(page.getByTestId("reception-staff-view")).toBeVisible();
    await page.getByTestId("reception-nav-services").click();
    await expect(page.getByTestId("reception-services-view")).toBeVisible();
    await page.getByTestId("reception-nav-products").click();
    await expect(page.getByTestId("reception-products-view")).toBeVisible();
    await page.getByTestId("reception-nav-reports").click();
    await expect(page.getByTestId("reception-reports-view")).toBeVisible();
    await page.getByTestId("reception-nav-calendar").click();
    await expect(page.getByTestId("reception-client-panel")).toBeVisible();
  });
});

test.describe("Customer display theme", () => {
  test("can switch light and dark", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.removeItem("fhsalon-customer-theme");
      } catch {
        /* ignore */
      }
    });
    await page.goto(`/display/${DEMO.slug}`);
    await expect(page.getByTestId("customer-theme-toggle")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".customer-board")).toHaveAttribute("data-customer-theme", "light");

    await page.getByTestId("customer-theme-dark").click();
    await expect(page.locator(".customer-board")).toHaveAttribute("data-customer-theme", "dark");

    await page.getByTestId("customer-theme-light").click();
    await expect(page.locator(".customer-board")).toHaveAttribute("data-customer-theme", "light");
  });

  test("shows a wait timer under each stylist", async ({ page }) => {
    await page.goto(`/display/${DEMO.slug}`);
    const waits = page.getByTestId("customer-stylist-wait");
    await expect(waits.first()).toBeVisible({ timeout: 20_000 });
    await expect(waits.first()).toHaveText(/Available now|Wait |Opens |Closed|Done for today/i);
  });
});
