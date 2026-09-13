import { expect, test } from "@playwright/test";
import { DEMO, gotoSettled } from "./helpers";

test.describe("store display redirect", () => {
  test("roots /display/:slug to an enabled surface", async ({ page }) => {
    await gotoSettled(page, `/display/${DEMO.slug}`);
    await expect(page).toHaveURL(
      new RegExp(`/display/${DEMO.slug}/(lounge|scheduler)`),
      { timeout: 20_000 }
    );
    // Lounge and scheduler both render live boards — either is a success for redirect.
    await expect(page.locator("body")).not.toContainText(/no store display enabled/i);
  });

  test("lounge and scheduler surfaces load for seeded salon", async ({ page }) => {
    await gotoSettled(page, `/display/${DEMO.slug}/lounge`);
    await expect(page).toHaveURL(new RegExp(`/display/${DEMO.slug}/lounge`));
    await expect(page.locator("body")).not.toContainText(/this page could not be found/i);

    await gotoSettled(page, `/display/${DEMO.slug}/scheduler`);
    await expect(page).toHaveURL(new RegExp(`/display/${DEMO.slug}/scheduler`));
    await expect(page.locator("body")).not.toContainText(/this page could not be found/i);
  });
});
