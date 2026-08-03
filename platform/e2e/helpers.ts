import { expect, type Page } from "@playwright/test";

export const DEMO = {
  adminEmail: "admin@fhsalon.ca",
  stylistEmail: "farzana@fhsalon.ca",
  password: "demo1234",
  slug: "fhsalon",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function formatDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayDate() {
  return formatDate(new Date());
}

/** Today if Mon–Sat, otherwise next Monday — Sundays are typically off in seed. */
export function bookableDateNearToday() {
  const d = new Date();
  for (let i = 0; i < 8; i++) {
    if (d.getDay() !== 0) return formatDate(d);
    d.setDate(d.getDate() + 1);
  }
  return formatDate(d);
}

/** Next weekday (Mon–Sat) as YYYY-MM-DD — Sundays are typically off in seed. */
export function nextOpenDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  for (let i = 0; i < 8; i++) {
    if (d.getDay() !== 0) break;
    d.setDate(d.getDate() + 1);
  }
  return formatDate(d);
}

export function toLocalDateTimeInput(d: Date) {
  return `${formatDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

export async function pickFirstSlot(page: Page, startDate: string) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const d = new Date(startDate + "T12:00:00");
    d.setDate(d.getDate() + attempt);
    if (d.getDay() === 0) continue;
    const dateStr = formatDate(d);
    await page.locator('input[type="date"]').fill(dateStr);
    await page.waitForTimeout(700);
    const slotButtons = page.getByRole("button").filter({ hasText: /\d{1,2}:\d{2}|a\.m\.|p\.m\./i });
    if ((await slotButtons.count()) === 0) continue;
    await slotButtons.first().click();
    return dateStr;
  }
  throw new Error(`No open slots found starting from ${startDate}`);
}

export async function bookOnline(
  page: Page,
  opts: {
    clientName: string;
    phone?: string;
    notes?: string;
    servicePattern?: RegExp;
    stylistPattern?: RegExp;
    date?: string;
  }
) {
  const servicePattern = opts.servicePattern ?? /men'?s haircut|women'?s trim|beard/i;
  const stylistPattern = opts.stylistPattern ?? /farzana/i;
  const date = opts.date ?? nextOpenDate();

  await page.goto(`/book/${DEMO.slug}`);
  await expect(page.getByRole("heading", { name: /choose a service/i })).toBeVisible();
  await page.getByRole("button").filter({ hasText: servicePattern }).first().click();
  await expect(page.getByRole("heading", { name: /choose your stylist/i })).toBeVisible();
  await page.getByRole("button").filter({ hasText: stylistPattern }).first().click();
  await expect(page.getByRole("heading", { name: /pick a time/i })).toBeVisible();
  const bookedDate = await pickFirstSlot(page, date);
  await expect(page.getByRole("heading", { name: /your details/i })).toBeVisible();
  await page.getByLabel(/^name$/i).fill(opts.clientName);
  await page.getByLabel(/^phone$/i).fill(opts.phone ?? "9055550100");
  if (opts.notes) await page.getByLabel(/notes/i).fill(opts.notes);
  await page.getByRole("button", { name: /confirm reservation/i }).click();
  await expect(page.getByRole("heading", { name: /you.?re booked/i })).toBeVisible({
    timeout: 20_000,
  });
  return bookedDate;
}
