import { test, expect } from "@playwright/test";
import {
  adminLogin,
  bookOnline,
  bookableDateNearToday,
  clearOpenBookingsForStylist,
  continueBookingToProvider,
  continueBookingToTime,
  DEMO,
  joinAsMember,
  nextOpenDate,
  pickFirstSlot,
  todayDate,
  waitForBookingStep,
} from "./helpers";

test.describe("Booking member auth", () => {
  test("client app is locked to the gold luxury look", async ({ page }) => {
    await page.goto(`/book/${DEMO.slug}`);
    await expect(page.locator("html")).toHaveAttribute("data-salon-theme", "cocoa");
    await expect(page.locator("html")).toHaveClass(/book-shell--marketplace/);
    await expect(page.locator("html")).not.toHaveClass(/book-shell--light/);

    await page.getByTestId("book-nav-profile").click();
    const profile = page.getByTestId("book-profile");
    await expect(profile).toBeVisible();
    await expect(profile.getByTestId("book-theme-toggle")).toHaveCount(0);
  });

  test("sign out clears guest contact fields on summary step", async ({ page }) => {
    const stamp = Date.now();
    const name = `QA Member ${stamp}`;
    const email = `qa.member.${stamp}@example.com`;

    await joinAsMember(page, {
      name,
      phone: "9055550188",
      email,
    });
    await expect(page.getByText(name).first()).toBeVisible();

    // Advance to details — scope past Style preview AI chips (e.g. "Beard tidy")
    const services = page.locator("section").filter({
      has: page.getByRole("heading", { name: /choose services?/i }),
    });
    await services
      .getByRole("button")
      .filter({ hasText: /men'?s haircut|women'?s trim|beard/i })
      .first()
      .click();
    await continueBookingToProvider(page);
    const stylists = page.locator("section").filter({
      has: page.getByRole("heading", { name: /choose your (stylist|provider)/i }),
    });
    await stylists
      .getByRole("button")
      .filter({ hasText: /farzana|aisha|omar|aadil/i })
      .first()
      .click();
    await continueBookingToTime(page);
    await expect(page.getByRole("heading", { name: /pick a time/i })).toBeVisible();

    await pickFirstSlot(page, nextOpenDate());
    await waitForBookingStep(page, /booking summary/i);

    await expect(page.getByRole("heading", { name: /booking summary/i })).toBeVisible();
    await expect(page.getByText(`Signed in as ${name}`)).toBeVisible();

    await page.getByRole("button", { name: /^sign out$/i }).click();
    await expect(page.getByRole("button", { name: /^join free$/i })).toBeVisible({
      timeout: 10_000,
    });

    // Summary step may still be open; guest contact fields should appear cleared
    await expect(page.getByLabel(/^name$/i)).toHaveValue("");
    await expect(page.getByLabel(/^phone$/i)).toHaveValue("");
    await expect(page.getByLabel(/^email/i)).toHaveValue("");
  });
});

test.describe("Store display shows online bookings", () => {
  test("online booking appears on store display board", async ({ page, browser }) => {
    const clientName = `QA Display ${Date.now()}`;
    await adminLogin(page);
    await clearOpenBookingsForStylist(page, /farzana/i);

    const bookedDate = await bookOnline(page, {
      clientName,
      phone: `416${String(Date.now()).slice(-7)}`,
      notes: "Display board visibility QA",
      servicePattern: /bang \/ fringe trim/i,
      stylistPattern: /farzana/i,
      date: bookableDateNearToday(),
    });

    const guest = await browser.newContext();
    const tablet = await guest.newPage();
    try {
      const loaded = tablet.waitForResponse(
        (r) => r.url().includes(`/api/display/${DEMO.slug}/today`) && r.ok(),
        { timeout: 20_000 }
      );
      const login = await tablet.request.post(
        `/api/auth/login?salon=${encodeURIComponent(DEMO.slug)}`,
        {
          data: {
            email: DEMO.adminEmail,
            password: DEMO.password,
            salonSlug: DEMO.slug,
          },
        }
      );
      expect(login.ok(), `tablet reception login: ${await login.text()}`).toBeTruthy();
      await tablet.goto(`/display/${DEMO.slug}/reception`);

      await expect(tablet.getByTestId("store-display-board")).toBeVisible({
        timeout: 15_000,
      });
      await loaded.catch(() => undefined);
      const onBoard = tablet.getByText(clientName).first();
      await expect(onBoard).toBeVisible({ timeout: 20_000 });
    } finally {
      await guest.close();
    }

    // API must return the booking when unlocked / no PIN (manager session bypass)
    await adminLogin(page);

    const res = await page.request.get(`/api/display/${DEMO.slug}/today?days=21`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    const names = (data.appointments || []).map(
      (a: { client?: { name?: string } }) => a.client?.name
    );
    expect(names).toContain(clientName);
    expect(data.salon?.timezone || data.range?.timezone).toBeTruthy();
  });
});
