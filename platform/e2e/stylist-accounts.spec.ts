import { test, expect, type Page } from "@playwright/test";
import { adminLogin } from "./helpers";

async function loginAsStylist(page: Page, email: string, password: string) {
  await page.goto("/stylist/login");
  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/stylist(?!\/login)/, { timeout: 20_000 });
}

test.describe("Stylist account provisioning", () => {
  test("admin creates stylist login; stylist changes password", async ({ page }) => {
    const unique = `Pw${Date.now().toString(36)}`;
    const stylistName = `${unique} Stylist`;
    const newPassword = `Changed${Date.now().toString(36)}9`;

    await adminLogin(page);
    await page.goto("/manager/stylists");
    await expect(page.getByRole("heading", { name: /stylists & logins/i })).toBeVisible();

    await page.getByPlaceholder(/stylist name/i).fill(stylistName);
    await page.getByPlaceholder(/bio/i).fill("E2E provisioned stylist");
    await page.getByRole("button", { name: /add stylist \+ login/i }).click();

    const issued = page.getByTestId("issued-credentials");
    await expect(issued).toBeVisible({ timeout: 20_000 });
    await expect(issued.getByText(/share with|new password/i)).toBeVisible();

    const emailText = await issued.getByTestId("issued-email").innerText();
    const tempPassword = await issued.getByTestId("issued-password").innerText();
    expect(emailText).toMatch(new RegExp(`^${unique.toLowerCase()}@`, "i"));
    expect(tempPassword.length).toBeGreaterThanOrEqual(8);

    await issued.getByRole("button", { name: /^done$/i }).click();
    await expect(issued).toBeHidden();

    await page.context().clearCookies();
    await loginAsStylist(page, emailText.trim(), tempPassword.trim());
    await expect(page.getByRole("link", { name: /^profile$/i })).toBeVisible();

    await page.getByRole("link", { name: /^profile$/i }).click();
    await expect(page.getByRole("heading", { name: /^profile$/i })).toBeVisible();
    await expect(page.getByLabel(/^email$/i).first()).toHaveValue(emailText.trim());

    await page.getByLabel(/current password/i).fill(tempPassword.trim());
    await page.getByLabel(/^new password/i).fill(newPassword);
    await page.getByLabel(/confirm new password/i).fill(newPassword);
    await page.getByRole("button", { name: /save login/i }).click();
    await expect(page.getByText(/login updated|updated|password/i)).toBeVisible();

    await page.getByRole("button", { name: /log out/i }).click();
    await expect(page).toHaveURL(/\/stylist\/login/);

    // Old temp password should fail
    await page.getByLabel(/^email$/i).fill(emailText.trim());
    await page.getByLabel(/^password$/i).fill(tempPassword.trim());
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText(/invalid|failed|error/i)).toBeVisible();

    await loginAsStylist(page, emailText.trim(), newPassword);
    await expect(page.getByRole("link", { name: /^my jobs$/i })).toBeVisible();
  });
});
