import path from "path";
import { test, expect } from "@playwright/test";
import { DEMO, gotoSettled, stylistLogin } from "./helpers";

const selfieFixture = path.join(__dirname, "fixtures", "selfie.png");
const womenService = /women'?s (hair)?cut|women'?s trim|blow-dry|bang|fringe/i;

async function openStylistStep(page: import("@playwright/test").Page, service: string | RegExp) {
  await gotoSettled(page, `/book/${DEMO.slug}`);
  await expect(page.getByRole("heading", { name: /choose services?/i })).toBeVisible();
  const services = page.locator("section").filter({
    has: page.getByRole("heading", { name: /choose services?/i }),
  });
  if (typeof service === "string") {
    await services
      .getByRole("button")
      .filter({ has: page.getByText(service, { exact: true }) })
      .first()
      .click();
  } else {
    await services.getByRole("button").filter({ hasText: service }).first().click();
  }
  await expect(page.getByRole("heading", { name: /choose your stylist/i })).toBeVisible();
  return page.locator("section").filter({
    has: page.getByRole("heading", { name: /choose your stylist/i }),
  });
}

test.describe("Stylist profile photo", () => {
  test("default avatar shows on booking; selfie replaces it", async ({ page }) => {
    await stylistLogin(page);
    await gotoSettled(page, "/stylist/account");
    await expect(page.getByTestId("stylist-profile-card")).toBeVisible();
    const remove = page.getByRole("button", {
      name: /remove photo|use default avatar instead|use avatar instead/i,
    });
    if (await remove.isVisible().catch(() => false)) {
      await remove.click();
      await expect(page.getByText(/photo removed/i)).toBeVisible({ timeout: 10_000 });
    }

    const stylists = await openStylistStep(page, womenService);
    const farzanaBtn = stylists.getByRole("button").filter({ hasText: /farzana/i }).first();
    await expect(farzanaBtn).toBeVisible();
    const avatar = farzanaBtn.locator("img").first();
    await expect(avatar).toBeVisible();
    await expect(avatar).toHaveAttribute("src", /avatars\/stylist-(female|neutral)\.svg/);

    await gotoSettled(page, "/stylist/account");
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

    const after = await openStylistStep(page, womenService);
    const bookedPhoto = after
      .getByRole("button")
      .filter({ hasText: /farzana/i })
      .first()
      .locator("img");
    await expect(bookedPhoto).toHaveAttribute("src", /\/api\/public\/stylist-photo\//, {
      timeout: 15_000,
    });

    await gotoSettled(page, "/stylist/account");
    await page
      .getByRole("button", {
        name: /remove photo|use default avatar instead|use avatar instead/i,
      })
      .click();
    await expect(page.getByText(/photo removed/i)).toBeVisible();
    await expect(page.getByTestId("stylist-photo-preview")).toHaveAttribute(
      "src",
      /avatars\/stylist-/
    );
  });

  test("male avatar used for male stylist without selfie", async ({ page }) => {
    const catalog = await (await page.request.get(`/api/public/${DEMO.slug}/catalog`)).json();
    const omar = catalog.stylists?.find((s: { name: string }) => /omar/i.test(s.name));
    expect(omar, "Omar in catalog").toBeTruthy();
    const men =
      catalog.services?.find(
        (s: { id: string; name: string }) =>
          omar.serviceIds?.includes(s.id) && /men|fade|beard/i.test(s.name)
      ) || catalog.services?.find((s: { id: string }) => omar.serviceIds?.includes(s.id));
    expect(men?.name, "Omar service").toBeTruthy();
    const stylists = await openStylistStep(page, men.name as string);
    const omarBtn = stylists.getByRole("button").filter({ hasText: /omar/i }).first();
    await omarBtn.scrollIntoViewIfNeeded();
    await expect(omarBtn).toBeVisible({ timeout: 15_000 });
    await expect(omarBtn.locator("img")).toHaveAttribute(
      "src",
      String(omar.photoUrl || "").includes("stylist-photo")
        ? /\/api\/public\/stylist-photo\//
        : /avatars\/stylist-male\.svg/
    );
  });
});
