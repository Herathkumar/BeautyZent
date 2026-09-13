import { expect, test } from "@playwright/test";
import { DEMO, gotoSettled, joinAsMember } from "./helpers";

test.describe("explore business detail", () => {
  test("opens seeded salon menu and deep-links into booking", async ({ page }) => {
    await gotoSettled(page, "/explore");
    await expect(page.getByLabel("Business or service")).toBeVisible();

    const menuLink = page.getByTestId(`explore-menu-${DEMO.slug}`);
    await expect(menuLink).toBeVisible({ timeout: 20_000 });
    await menuLink.click();

    await expect(page).toHaveURL(new RegExp(`/explore/${DEMO.slug}`));
    await expect(page.getByRole("heading", { name: /farzana hair salon/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /book a visit/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /save to favorites/i })).toBeVisible();

    await page.getByRole("link", { name: /book a visit/i }).first().click();
    await expect(page).toHaveURL(new RegExp(`/book/${DEMO.slug}.*from=explore`));
    await expect(page.getByRole("heading", { name: /choose services?/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("directory Book CTA deep-links with from=explore", async ({ page }) => {
    await gotoSettled(page, "/explore");
    const book = page.getByTestId(`explore-book-${DEMO.slug}`);
    await expect(book).toBeVisible({ timeout: 20_000 });
    await expect(book).toHaveAttribute("href", new RegExp(`/book/${DEMO.slug}\\?from=explore`));
    await book.click();
    await expect(page).toHaveURL(new RegExp(`/book/${DEMO.slug}.*from=explore`));
    await expect(page.getByRole("heading", { name: /choose services?/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("signed-in consumer can favorite from business detail", async ({ page }) => {
    const email = `explore-fav-${Date.now()}@example.test`;
    await joinAsMember(page, {
      name: "Explore Fav",
      phone: "4165550188",
      email,
    });

    await gotoSettled(page, `/explore/${DEMO.slug}`);
    const save = page.getByRole("button", { name: /save to favorites/i });
    await expect(save).toBeVisible({ timeout: 20_000 });
    await save.click();
    await expect(page.getByRole("button", { name: /remove from favorites/i })).toBeVisible({
      timeout: 15_000,
    });

    const account = await page.request.get("/api/public/account");
    expect(account.ok(), await account.text()).toBeTruthy();
    const data = await account.json();
    expect(data.favorites?.some((f: { slug?: string }) => f.slug === DEMO.slug)).toBeTruthy();
  });
});
