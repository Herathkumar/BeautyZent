import { test, expect } from "@playwright/test";
import {
  bookOnline,
  bookableDateNearToday,
  DEMO,
  joinAsMember,
  nextOpenDate,
  todayDate,
} from "./helpers";

test.describe("Booking member auth", () => {
  test("guest can open Appearance and save theme without signing in", async ({
    page,
  }) => {
    await page.goto(`/book/${DEMO.slug}`);
    await page.getByTestId("book-nav-appearance").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: /^light$/i }).click();
    await page.getByRole("button", { name: /^save$/i }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const pref = await page.evaluate(() =>
      window.localStorage.getItem("fhsalon-book-theme")
    );
    expect(pref).toBe("light");
  });

  test("sign out clears Your details fields", async ({ page }) => {
    const stamp = Date.now();
    const name = `QA Member ${stamp}`;
    const email = `qa.member.${stamp}@example.com`;

    await joinAsMember(page, {
      name,
      phone: "9055550188",
      email,
    });
    await expect(page.getByText(name).first()).toBeVisible();

    // Advance to details so fields are visible
    await page
      .getByRole("button")
      .filter({ hasText: /men'?s haircut|women'?s trim|beard/i })
      .first()
      .click();
    await page
      .getByRole("button")
      .filter({ hasText: /farzana|aisha|omar|aadil|any stylist/i })
      .first()
      .click();
    await expect(page.getByRole("heading", { name: /pick a time/i })).toBeVisible();

    const openDate = nextOpenDate();
    await page.locator('input[type="date"]').fill(openDate);
    await page.waitForTimeout(700);
    const slot = page
      .getByRole("button")
      .filter({ hasText: /\d{1,2}:\d{2}|a\.m\.|p\.m\./i })
      .first();
    await expect(slot).toBeVisible({ timeout: 15_000 });
    await slot.click();

    await expect(page.getByRole("heading", { name: /your details/i })).toBeVisible();
    await expect(page.getByLabel(/^name$/i)).toHaveValue(name);
    await expect(page.getByLabel(/^email/i)).toHaveValue(email);

    await page.getByRole("button", { name: /^sign out$/i }).click();
    await expect(page.getByRole("button", { name: /^join free$/i })).toBeVisible({
      timeout: 10_000,
    });

    // Details step may still be open, but member PII must be cleared
    await expect(page.getByLabel(/^name$/i)).toHaveValue("");
    await expect(page.getByLabel(/^phone$/i)).toHaveValue("");
    await expect(page.getByLabel(/^email/i)).toHaveValue("");
  });
});

test.describe("Store display shows online bookings", () => {
  test("online booking appears on store display board", async ({ page, browser }) => {
    const clientName = `QA Display ${Date.now()}`;
    const bookedDate = await bookOnline(page, {
      clientName,
      phone: "9055550177",
      notes: "Display board visibility QA",
      date: bookableDateNearToday(),
    });

    const guest = await browser.newContext();
    const tablet = await guest.newPage();
    try {
      await tablet.goto(`/display/${DEMO.slug}`);

      // If PIN pad shows, board is locked — skip unlock here (covered by display-pin.spec)
      const pad = tablet.getByTestId("display-pin-pad");
      if (await pad.isVisible({ timeout: 3_000 }).catch(() => false)) {
        test.info().annotations.push({
          type: "note",
          description: "Display PIN active — unlock required; API assert below still runs via manager session",
        });
      } else {
        await expect(tablet.getByTestId("store-display-board")).toBeVisible({
          timeout: 15_000,
        });

        const today = todayDate();
        if (bookedDate === today) {
          await tablet.getByRole("button", { name: /^today/i }).click();
        } else {
          await tablet.getByRole("button", { name: /^future/i }).click();
        }
        await expect(tablet.getByText(clientName)).toBeVisible({ timeout: 20_000 });
      }
    } finally {
      await guest.close();
    }

    // API must return the booking when unlocked / no PIN (manager session bypass)
    await page.goto("/manager/login");
    await page.getByLabel(/email/i).fill(DEMO.adminEmail);
    await page.getByLabel(/password/i).fill(DEMO.password);
    await page.locator('form button[type="submit"]').click();
    await expect(page).toHaveURL(/\/manager(?!\/login)/, { timeout: 20_000 });

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
