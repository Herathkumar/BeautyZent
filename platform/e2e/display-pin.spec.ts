import { test, expect, type Page } from "@playwright/test";
import { adminLogin, DEMO } from "./helpers";

/** Stable PIN for this suite — always cleared in finally. */
const E2E_PIN = "4829";

async function pinStatus(page: Page) {
  const res = await page.request.get("/api/admin/display-pin");
  expect(res.ok()).toBeTruthy();
  return res.json() as Promise<{ pinSet: boolean; slug?: string }>;
}

async function setPin(page: Page, pin: string, currentPin?: string) {
  const res = await page.request.put("/api/admin/display-pin", {
    data: {
      pin,
      confirmPin: pin,
      ...(currentPin ? { currentPin } : {}),
    },
  });
  const data = await res.json();
  if (!res.ok()) {
    throw new Error(data.error || `Failed to set PIN (${res.status()})`);
  }
  return data;
}

async function removePin(page: Page, currentPin: string) {
  const res = await page.request.delete("/api/admin/display-pin", {
    data: { currentPin },
  });
  const data = await res.json();
  if (!res.ok()) {
    throw new Error(data.error || `Failed to remove PIN (${res.status()})`);
  }
  return data;
}

/** Ensure we own the PIN (set or replace with E2E_PIN) so cleanup can always clear it. */
async function ensureE2ePin(page: Page) {
  const status = await pinStatus(page);
  if (!status.pinSet) {
    await setPin(page, E2E_PIN);
    return;
  }
  // Already set — try updating with our known PIN as current (prior run left it)
  try {
    await setPin(page, E2E_PIN, E2E_PIN);
  } catch {
    // Unknown PIN from a prior manual set — leave for UI path; cleanup may fail
    await setPin(page, E2E_PIN, E2E_PIN).catch(() => undefined);
  }
}

async function clearE2ePin(page: Page) {
  const status = await pinStatus(page);
  if (!status.pinSet) return;
  await removePin(page, E2E_PIN);
}

async function enterPinOnPad(page: Page, pin: string) {
  const pad = page.getByTestId("display-pin-pad");
  await expect(pad).toBeVisible({ timeout: 15_000 });
  for (const digit of pin) {
    await pad.getByRole("button", { name: digit, exact: true }).click();
  }
  // Unlock button remains for 5-digit PINs / slower devices; ignore if auto-submit already unlocked
  const unlock = pad.getByRole("button", { name: /^unlock$/i });
  if (await unlock.isVisible().catch(() => false)) {
    await unlock.click({ timeout: 3_000 }).catch(() => undefined);
  }
}

test.describe("Store display PIN", () => {
  test("manager sets PIN; tablet requires it; unlock works; PIN removed", async ({
    page,
    browser,
  }) => {
    await adminLogin(page);
    await page.goto("/manager/display");
    await expect(page.getByTestId("manager-display-pin")).toBeVisible();

    try {
      // UI: set or update to E2E_PIN
      const status = await pinStatus(page);
      if (status.pinSet) {
        // Prefer API with known PIN so we don't fight an unknown prior PIN in the form
        try {
          await setPin(page, E2E_PIN, E2E_PIN);
        } catch {
          await ensureE2ePin(page);
        }
      } else {
        await page.getByLabel(/^pin \(4–6 digits\)$/i).fill(E2E_PIN);
        await page.getByLabel(/^confirm pin$/i).fill(E2E_PIN);
        await page.getByRole("button", { name: /^set pin$/i }).click();
        await expect(page.getByText(/pin set|tablet url now asks/i)).toBeVisible({
          timeout: 15_000,
        });
      }

      await expect(page.getByText(/a pin is active/i)).toBeVisible();

      // Manager embedded board still works (session bypass)
      await expect(page.getByTestId("manager-store-display-board")).toBeVisible({
        timeout: 20_000,
      });

      // Guest tablet context — no manager session / unlock cookie
      const guest = await browser.newContext();
      const tablet = await guest.newPage();
      try {
        await tablet.goto(`/display/${DEMO.slug}`);
        await expect(tablet.getByTestId("display-pin-pad")).toBeVisible({
          timeout: 15_000,
        });

        // Wrong PIN stays locked
        await enterPinOnPad(tablet, "0000");
        await expect(tablet.getByText(/incorrect pin/i)).toBeVisible();
        await expect(tablet.getByTestId("display-pin-pad")).toBeVisible();

        // Correct PIN unlocks
        await enterPinOnPad(tablet, E2E_PIN);
        await expect(tablet.getByTestId("store-display-board")).toBeVisible({
          timeout: 15_000,
        });
        await expect(tablet.getByTestId("display-pin-pad")).toHaveCount(0);

        // Lock again via padlock
        await tablet.getByTestId("display-padlock").click();
        await expect(tablet.getByTestId("display-pin-pad")).toBeVisible({
          timeout: 15_000,
        });
      } finally {
        await guest.close();
      }

      // APIs reject without unlock / session
      const anon = await browser.newContext();
      try {
        const locked = await anon.request.get(`/api/display/${DEMO.slug}/today`);
        expect(locked.status()).toBe(401);
        const lockedBody = await locked.json();
        expect(lockedBody.needsPin).toBe(true);
      } finally {
        await anon.close();
      }

      // Remove PIN via manager UI
      await page.goto("/manager/display");
      await page.getByLabel(/^current pin$/i).fill(E2E_PIN);
      await page.getByRole("button", { name: /^remove pin$/i }).click();
      await expect(page.getByText(/pin removed|open again/i)).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByText(/no pin yet/i)).toBeVisible();

      // Public tablet open again
      const openGuest = await browser.newContext();
      const openTablet = await openGuest.newPage();
      try {
        await openTablet.goto(`/display/${DEMO.slug}`);
        await expect(openTablet.getByTestId("store-display-board")).toBeVisible({
          timeout: 15_000,
        });
        await expect(openTablet.getByTestId("display-pin-pad")).toHaveCount(0);
      } finally {
        await openGuest.close();
      }
    } finally {
      // Always leave the shared DB without a PIN for other display e2e
      try {
        await clearE2ePin(page);
      } catch {
        /* ignore — UI path may have already cleared */
      }
    }
  });

  test("manager can update PIN from the Store display card", async ({
    page,
    browser,
  }) => {
    const nextPin = "1357";
    await adminLogin(page);

    try {
      await ensureE2ePin(page);
      await page.goto("/manager/display");
      await expect(page.getByTestId("manager-display-pin")).toBeVisible();

      await page.getByLabel(/^current pin$/i).fill(E2E_PIN);
      await page.getByLabel(/^new pin$/i).fill(nextPin);
      await page.getByLabel(/^confirm pin$/i).fill(nextPin);
      await page.getByRole("button", { name: /^update pin$/i }).click();
      await expect(page.getByText(/pin updated|new pin/i)).toBeVisible({
        timeout: 15_000,
      });

      const guest = await browser.newContext();
      const tablet = await guest.newPage();
      try {
        await tablet.goto(`/display/${DEMO.slug}`);
        await enterPinOnPad(tablet, E2E_PIN);
        await expect(tablet.getByText(/incorrect pin/i)).toBeVisible();
        await enterPinOnPad(tablet, nextPin);
        await expect(tablet.getByTestId("store-display-board")).toBeVisible({
          timeout: 15_000,
        });
      } finally {
        await guest.close();
      }

      await removePin(page, nextPin);
    } finally {
      // Prefer clearing whichever PIN we may have left
      const status = await pinStatus(page).catch(() => ({ pinSet: false }));
      if (status.pinSet) {
        await removePin(page, nextPin).catch(() => removePin(page, E2E_PIN));
      }
    }
  });
});
