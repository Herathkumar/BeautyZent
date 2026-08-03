import path from "path";
import { test, expect } from "@playwright/test";
import { DEMO, stylistLogin } from "./helpers";

const selfieFixture = path.join(__dirname, "fixtures", "selfie.png");

test.describe("Stylist profile photo", () => {
  test("default avatar shows on booking; selfie replaces it", async ({ page }) => {
    // Booking shows gender avatar before any selfie
    await page.goto(`/book/${DEMO.slug}`);
    await page.getByRole("button").filter({ hasText: /women'?s haircut|women'?s trim/i }).first().click();
    await expect(page.getByRole("heading", { name: /choose your stylist/i })).toBeVisible();
    const farzanaBtn = page.getByRole("button").filter({ hasText: /farzana/i }).first();
    await expect(farzanaBtn).toBeVisible();
    const avatar = farzanaBtn.locator('img[alt*="Farzana" i]');
    await expect(avatar).toBeVisible();
    await expect(avatar).toHaveAttribute("src", /avatars\/stylist-(female|neutral)\.svg/);

    // Stylist uploads selfie
    await stylistLogin(page);
    await page.getByRole("link", { name: /^account$/i }).click();
    await expect(page.getByRole("heading", { name: /profile photo/i })).toBeVisible();
    await expect(page.getByTestId("stylist-photo-preview")).toHaveAttribute(
      "src",
      /avatars\/stylist-/
    );

    await page.getByTestId("stylist-selfie-input").setInputFiles(selfieFixture);
    await expect(page.getByText(/selfie saved|clients will see/i)).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("stylist-photo-preview")).toHaveAttribute(
      "src",
      /\/api\/public\/stylist-photo\//
    );

    // Online booking now shows the selfie URL for Farzana
    await page.goto(`/book/${DEMO.slug}`);
    await page.getByRole("button").filter({ hasText: /women'?s haircut|women'?s trim/i }).first().click();
    const bookedPhoto = page
      .getByRole("button")
      .filter({ hasText: /farzana/i })
      .first()
      .locator("img");
    await expect(bookedPhoto).toHaveAttribute("src", /\/api\/public\/stylist-photo\//);

    // Cleanup: restore avatar so later runs start from defaults
    await page.goto("/stylist/account");
    await page.getByRole("button", { name: /use avatar instead/i }).click();
    await expect(page.getByText(/photo removed/i)).toBeVisible();
    await expect(page.getByTestId("stylist-photo-preview")).toHaveAttribute(
      "src",
      /avatars\/stylist-/
    );
  });

  test("male avatar used for male stylist without selfie", async ({ page }) => {
    await page.goto(`/book/${DEMO.slug}`);
    await page.getByRole("button").filter({ hasText: /men'?s haircut|fade|beard/i }).first().click();
    await expect(page.getByRole("heading", { name: /choose your stylist/i })).toBeVisible();
    const omar = page.getByRole("button").filter({ hasText: /omar/i }).first();
    await expect(omar.locator("img")).toHaveAttribute("src", /avatars\/stylist-male\.svg/);
  });
});
