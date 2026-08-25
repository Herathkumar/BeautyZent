import { test, expect } from "@playwright/test";
import { DEMO, acceptConfirm, joinAsMember } from "./helpers";

/** 1×1 PNG — small but decodable by the browser-side resizer. */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

test.describe("FHS Client profile", () => {
  test("app is branded for this salon", async ({ page }) => {
    await page.goto(`/book/${DEMO.slug}`);
    await expect(page).toHaveTitle(/Farzana Hair Salon|FHS Client/i);

    const manifest = await page.request.get(`/book/${DEMO.slug}/manifest`);
    expect(manifest.ok()).toBeTruthy();
    const body = await manifest.json();
    expect(body.name).toMatch(/Farzana Hair Salon|FHS Client/i);
    expect(body.short_name).toMatch(/Farzana Hair Salon|FHS Client/i);
  });

  test("member saves a selfie, edits details, and signs out from Profile", async ({
    page,
  }) => {
    const stamp = Date.now();
    const contact = {
      name: `QA Profile ${stamp}`,
      email: `qa.profile.${stamp}@example.com`,
      phone: `905${String(stamp).slice(-7)}`,
    };
    await joinAsMember(page, contact);

    await page.getByTestId("book-nav-profile").click();
    const profile = page.getByTestId("book-profile");
    await expect(profile).toBeVisible();
    await expect(profile.getByText(contact.email)).toBeVisible();

    // Selfie upload via the gallery input
    await profile
      .getByTestId("client-photo-input")
      .setInputFiles({ name: "me.png", mimeType: "image/png", buffer: TINY_PNG });
    await expect(profile.getByText(/selfie saved/i)).toBeVisible({ timeout: 20_000 });
    await expect(profile.getByTestId("client-photo-preview")).toHaveAttribute(
      "src",
      /profile\/photo\/file/
    );

    const saved = await page.request.get(`/api/public/${DEMO.slug}/profile`);
    expect((await saved.json()).client.hasPhoto).toBe(true);

    // Rename through the editor
    const newName = `${contact.name} R`;
    await profile.getByTestId("client-edit-profile").click();
    const editor = profile.getByTestId("client-profile-editor");
    await editor.getByLabel(/^name$/i).fill(newName);
    await editor.getByRole("button", { name: /save profile/i }).click();
    await expect(profile.getByText(/profile updated/i)).toBeVisible({ timeout: 15_000 });

    const renamed = await page.request.get(`/api/public/${DEMO.slug}/profile`);
    expect((await renamed.json()).client.name).toBe(newName);

    // Appearance lives here now
    await expect(profile.getByTestId("book-theme-toggle")).toBeVisible();

    await profile.getByTestId("client-sign-out").scrollIntoViewIfNeeded();
    const loggedOut = page.waitForResponse(
      (r) => r.url().includes("/auth/logout") && r.request().method() === "POST",
      { timeout: 30_000 }
    );
    await profile.getByTestId("client-sign-out").evaluate((el: HTMLElement) => el.click());
    await acceptConfirm(page);
    await loggedOut;
    await expect(page.getByRole("button", { name: /^join free$/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("profile photo is private to the signed-in member", async ({ request }) => {
    const res = await request.get(`/api/public/${DEMO.slug}/profile/photo/file`);
    expect(res.status()).toBe(404);

    const profile = await request.get(`/api/public/${DEMO.slug}/profile`);
    expect(profile.status()).toBe(401);
  });
});
