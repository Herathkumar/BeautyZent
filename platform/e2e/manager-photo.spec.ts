import path from "path";
import { test, expect } from "@playwright/test";
import { adminLogin } from "./helpers";

const selfieFixture = path.join(__dirname, "fixtures", "selfie.png");

test.describe("Manager profile photo", () => {
  test("can upload selfie and remove it back to default avatar", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/manager/account");
    await expect(page.getByTestId("manager-profile-card")).toBeVisible();
    await expect(page.getByTestId("manager-photo-preview")).toBeVisible();
    await expect(page.getByTestId("manager-photo-button")).toBeVisible();

    await page.getByTestId("manager-selfie-input").setInputFiles(selfieFixture);
    await expect(page.getByText(/selfie saved|photo updated/i)).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("manager-photo-preview")).toHaveAttribute(
      "src",
      /\/api\/admin\/photo\/file/
    );

    await page.getByRole("button", { name: /remove photo/i }).click();
    await expect(page.getByText(/photo removed/i)).toBeVisible();
    await expect(page.getByTestId("manager-photo-preview")).toHaveAttribute(
      "src",
      /avatars\/manager-generic\.svg/
    );
  });
});
