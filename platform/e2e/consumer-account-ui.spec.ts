import { expect, test } from "@playwright/test";
import { clearAuthSession, DEMO, gotoSettled, joinAsMember } from "./helpers";

test.describe("consumer account UI", () => {
  test("signs in with OTP and shows account tabs", async ({ page }) => {
    await clearAuthSession(page);
    const email = `account-ui-${Date.now()}@example.test`;

    // Consumer OTP requires an existing salon membership.
    await joinAsMember(page, {
      name: "Account UI Member",
      phone: "4165550177",
      email,
    });

    await clearAuthSession(page);
    await gotoSettled(page, "/account");
    await expect(page.getByRole("heading", { name: /my account/i })).toBeVisible({
      timeout: 20_000,
    });

    await page.getByLabel(/^email$/i).fill(email);
    await page.getByRole("button", { name: /email me a code/i }).click();
    await expect(page.getByText(/local demo code:/i)).toBeVisible({ timeout: 15_000 });
    const codeText = await page.getByText(/local demo code:/i).innerText();
    const code = (codeText.match(/\b(\d{6})\b/) || [])[1];
    expect(code, "Expected demo OTP on account sign-in").toBeTruthy();
    await page.getByLabel(/six-digit code/i).fill(code!);
    await page.getByRole("button", { name: /verify & open account/i }).click();

    await expect(page.getByRole("button", { name: /^bookings/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("button", { name: /^favorites/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^rewards/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^profile/i })).toBeVisible();

    await page.getByRole("button", { name: /^favorites/i }).click();
    await expect(page.getByText(/saved businesses|no favorites|favorites/i).first()).toBeVisible();

    await page.getByRole("button", { name: /^profile/i }).click();
    await expect(page.getByLabel(/^name$/i)).toBeVisible();
    await expect(page.getByLabel(/^phone$/i)).toBeVisible();
  });

  test("signed-out account page prompts for email OTP", async ({ page }) => {
    await clearAuthSession(page);
    await gotoSettled(page, "/account");
    await expect(page.getByRole("heading", { name: /my account/i })).toBeVisible();
    await expect(page.getByLabel(/^email$/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /email me a code/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /explore/i })).toBeVisible();
    void DEMO;
  });
});
