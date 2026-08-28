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
    await page.getByTestId("reception-nav-bookings").click();
    await expect(page.getByTestId("reception-bookings-view")).toBeVisible();
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

  test("calendar can browse upcoming days", async ({ page }) => {
    test.setTimeout(180_000);
    await receptionLogin(page);
    const day = page.getByTestId("reception-cal-day");
    await expect(day).toBeVisible({ timeout: 20_000 });
    await expect(day).toContainText(/today/i);

    const next = page.getByTestId("reception-cal-next");
    await expect(next).toBeEnabled();
    await next.click();
    await expect(day).not.toContainText(/today/i);

    await page.getByTestId("reception-cal-today").click();
    await expect(day).toContainText(/today/i);
  });

  test("reschedule stays on the reception desk", async ({ page }) => {
    test.setTimeout(180_000);
    await receptionLogin(page);
    const card = page.locator("[data-testid=reception-appt-card][data-appt-status=BOOKED]").first();
    if ((await card.count()) === 0) {
      test.info().annotations.push({
        type: "skip",
        description: "no BOOKED card on the reception board",
      });
      return;
    }
    await card.click();
    await page.getByTestId("reception-reschedule-open").click();
    await expect(page.getByTestId("reception-reschedule")).toBeVisible();
    await expect(page).not.toHaveURL(/\/manager\/appointments/);
    await expect(page.getByTestId("store-display-board")).toBeVisible();
  });
});

test.describe("Reception chairs", () => {
  test("shows chair status beside each stylist", async ({ page }) => {
    test.setTimeout(180_000);
    await receptionLogin(page);
    const waits = page.getByTestId("customer-stylist-wait");
    await expect(waits.first()).toBeVisible({ timeout: 20_000 });
    await expect(waits.first()).toHaveAttribute("data-wait-kind", /available|waiting|opens|closed|done/);
    await expect(waits.first().locator("svg")).toBeVisible();
    await expect(waits.first()).not.toHaveText(/Available now/i);
    const kind = await waits.first().getAttribute("data-wait-kind");
    if (kind === "available") {
      await expect(waits.first()).toHaveText(/^Available$/);
    } else if (kind === "opens") {
      await expect(waits.first()).toHaveText(/Opens /i);
    } else if (kind === "closed") {
      await expect(waits.first()).toHaveText(/Closed/i);
    } else if (kind === "done") {
      await expect(waits.first()).toHaveText(/^Off$/);
    }
    const rings = page.getByTestId("stylist-status-ring");
    await expect(rings.first()).toBeVisible();
    await expect(rings.first()).toHaveAttribute("data-status-tone", /available|busy|off/);
  });

  test("booked cards drag onto that stylist's chair to check in", async ({ page }) => {
    test.setTimeout(180_000);
    await receptionLogin(page);
    const drop = page.getByTestId("stylist-chair-drop").first();
    await expect(drop).toBeVisible({ timeout: 20_000 });
    const card = page.locator("[data-testid=reception-appt-card][data-appt-status=BOOKED]").first();
    if ((await card.count()) === 0) {
      test.info().annotations.push({ type: "skip", description: "no BOOKED card on the reception board" });
      return;
    }
    const guest = ((await card.innerText()) || "").trim().split(/\s+/)[0];
    const column = card.locator("xpath=ancestor::*[@data-stylist-column]");
    const chair = column.getByTestId("stylist-chair-drop");
    const box = await chair.boundingBox();
    const from = await card.boundingBox();
    expect(box && from).toBeTruthy();
    await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2, { steps: 16 });
    await page.mouse.up();
    const wait = chair.getByTestId("customer-stylist-wait");
    await expect(wait).toHaveAttribute("data-wait-kind", "waiting", { timeout: 12_000 });
    if (guest) await expect(wait).toContainText(new RegExp(guest, "i"));
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

  test("shows chair status beside each stylist", async ({ page }) => {
    await page.goto(`/display/${DEMO.slug}`);
    const waits = page.getByTestId("customer-stylist-wait");
    await expect(waits.first()).toBeVisible({ timeout: 20_000 });
    await expect(waits.first()).toHaveAttribute("data-wait-kind", /available|waiting|opens|closed|done/);
    await expect(waits.first().locator("svg")).toBeVisible();
    await expect(waits.first()).not.toHaveText(/Available now/i);
    const kind = await waits.first().getAttribute("data-wait-kind");
    if (kind === "available") {
      await expect(waits.first()).toHaveText(/^Available$/);
    } else if (kind === "opens") {
      await expect(waits.first()).toHaveText(/Opens /i);
    } else if (kind === "closed") {
      await expect(waits.first()).toHaveText(/Closed/i);
    } else if (kind === "done") {
      await expect(waits.first()).toHaveText(/^Off$/);
    }
    const rings = page.getByTestId("stylist-status-ring");
    await expect(rings.first()).toBeVisible();
    await expect(rings.first()).toHaveAttribute("data-status-tone", /available|busy|off/);
  });

  test("booked cards drag onto that stylist's chair to check in", async ({ page }) => {
    await page.goto(`/display/${DEMO.slug}`);
    const drop = page.getByTestId("stylist-chair-drop").first();
    await expect(drop).toBeVisible({ timeout: 20_000 });
    const card = page.locator("[data-testid=customer-appt-card][data-appt-status=BOOKED]").first();
    if ((await card.count()) === 0) {
      test.info().annotations.push({ type: "skip", description: "no BOOKED card on the demo board" });
      return;
    }
    const guest = ((await card.innerText()) || "").trim().split(/\s+/)[0];
    const column = card.locator("xpath=ancestor::*[@data-stylist-column]");
    const chair = column.getByTestId("stylist-chair-drop");
    const box = await chair.boundingBox();
    const from = await card.boundingBox();
    expect(box && from).toBeTruthy();
    await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2, { steps: 16 });
    await page.mouse.up();
    const wait = chair.getByTestId("customer-stylist-wait");
    await expect(wait).toHaveAttribute("data-wait-kind", "waiting", { timeout: 12_000 });
    if (guest) await expect(wait).toContainText(new RegExp(guest, "i"));
  });
});
