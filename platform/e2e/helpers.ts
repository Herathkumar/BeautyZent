import { expect, type Page } from "@playwright/test";

export const DEMO = {
  adminEmail: "admin@fhsalon.ca",
  stylistEmail: "farzana@fhsalon.ca",
  password: "demo1234",
  slug: "fhsalon",
};

/** Next weekday (Mon–Sat) as YYYY-MM-DD — Sundays are typically off in seed. */
export function nextOpenDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  for (let i = 0; i < 8; i++) {
    if (d.getDay() !== 0) break;
    d.setDate(d.getDate() + 1);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel(/email/i).fill(DEMO.adminEmail);
  await page.getByLabel(/password/i).fill(DEMO.password);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/admin(?!\/login)/, { timeout: 20_000 });
}

export async function stylistLogin(page: Page) {
  await page.goto("/stylist/login");
  await page.getByLabel(/email/i).fill(DEMO.stylistEmail);
  await page.getByLabel(/password/i).fill(DEMO.password);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/stylist(?!\/login)/, { timeout: 20_000 });
}
