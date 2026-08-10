import { expect, type Page } from "@playwright/test";

export const DEMO = {
  adminEmail: process.env.E2E_ADMIN_EMAIL || "manager@fhsalon.ca",
  stylistEmail: process.env.E2E_STYLIST_EMAIL || "farzana@fhsalon.ca",
  /** Override with E2E_ADMIN_PASSWORD when testing against production DB. */
  password: process.env.E2E_ADMIN_PASSWORD || "demo1234",
  slug: process.env.E2E_SALON_SLUG || "fhsalon",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Salon calendar date (America/Toronto) — avoids UTC day-rollover bugs. */
export function salonCalendarDate(d: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function formatDate(d: Date) {
  return salonCalendarDate(d);
}

export function todayDate() {
  return salonCalendarDate(new Date());
}

function salonWeekday(d: Date = new Date()) {
  // 0 Sun … 6 Sat in Toronto
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Toronto",
    weekday: "short",
  }).formatToParts(d);
  const wd = parts.find((p) => p.type === "weekday")?.value;
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[wd || "Mon"] ?? 1;
}

/** Today if Mon–Sat, otherwise next Monday — Sundays are typically off in seed. */
export function bookableDateNearToday() {
  const d = new Date();
  for (let i = 0; i < 8; i++) {
    if (salonWeekday(d) !== 0) return salonCalendarDate(d);
    d.setDate(d.getDate() + 1);
  }
  return salonCalendarDate(d);
}

/** Next weekday (Mon–Sat) as YYYY-MM-DD — Sundays are typically off in seed. */
export function nextOpenDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  for (let i = 0; i < 8; i++) {
    if (salonWeekday(d) !== 0) break;
    d.setDate(d.getDate() + 1);
  }
  return salonCalendarDate(d);
}

export function toLocalDateTimeInput(d: Date) {
  return `${formatDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export async function adminLogin(page: Page) {
  await page.goto("/manager/login");
  await page.getByLabel(/email/i).fill(DEMO.adminEmail);
  await page.getByLabel(/password/i).fill(DEMO.password);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/manager(?!\/login)/, { timeout: 20_000 });
}

/** Accept the themed in-app confirm dialog (replaces native window.confirm). */
export async function acceptConfirm(page: Page) {
  const dialog = page.getByTestId("confirm-dialog");
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await dialog.getByTestId("confirm-dialog-ok").click();
  await expect(dialog).toHaveCount(0);
}

/** Join the booking app as a member via the demo OTP code shown on screen. */
export async function joinAsMember(
  page: Page,
  opts: { name: string; phone: string; email: string }
) {
  await page.goto(`/book/${DEMO.slug}`);
  await page.getByRole("button", { name: /^join free$/i }).click();
  await page.getByLabel(/^name$/i).fill(opts.name);
  await page.getByLabel(/^phone$/i).fill(opts.phone);
  await page.getByLabel(/^email$/i).fill(opts.email);
  await page.getByRole("button", { name: /email me a code/i }).click();

  const demoCode = page.locator("text=/Demo code:/i");
  await expect(demoCode).toBeVisible({ timeout: 20_000 });
  const codeText = await demoCode.innerText();
  const code = (codeText.match(/\b(\d{6})\b/) || [])[1];
  expect(code, "Expected demo OTP code on screen").toBeTruthy();

  await page.getByLabel(/6-digit code/i).fill(code!);
  await page.getByRole("button", { name: /^join & continue$/i }).click();
  await expect(page.getByText(/^member$/i).first()).toBeVisible({ timeout: 15_000 });

  // Joining opens the Profile sheet — close it so the wizard is reachable.
  const profile = page.getByTestId("book-profile");
  if (await profile.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await profile.getByRole("button", { name: /^close$/i }).click();
    await expect(profile).toHaveCount(0);
  }
}

export async function stylistLogin(page: Page) {
  // Avoid leftover manager session interrupting navigation to the stylist app
  await page.context().clearCookies();
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
    email?: string;
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
  await expect(page.getByRole("heading", { name: /choose services?/i })).toBeVisible();
  // Scope to wizard — Style preview AI chips can match /beard/i before services load
  const services = page.locator("section").filter({
    has: page.getByRole("heading", { name: /choose services?/i }),
  });
  await services.getByRole("button").filter({ hasText: servicePattern }).first().click();
  await expect(page.getByRole("heading", { name: /choose your stylist/i })).toBeVisible();
  const stylists = page.locator("section").filter({
    has: page.getByRole("heading", { name: /choose your stylist/i }),
  });
  await stylists.getByRole("button").filter({ hasText: stylistPattern }).first().click();
  await expect(page.getByRole("heading", { name: /pick a time/i })).toBeVisible();
  const bookedDate = await pickFirstSlot(page, date);
  await expect(page.getByRole("heading", { name: /your details/i })).toBeVisible();
  const form = page.locator("form").filter({
    has: page.getByRole("heading", { name: /your details/i }),
  });
  await form.getByLabel(/^name$/i).fill(opts.clientName);
  await form.getByLabel(/^phone$/i).fill(opts.phone ?? "9055550100");
  // "Save my profile" is checked by default and requires email
  await form
    .getByLabel(/^email/i)
    .fill(opts.email ?? `qa.guest.${Date.now()}@example.com`);
  if (opts.notes) await form.getByLabel(/notes/i).fill(opts.notes);
  await expect(form.getByLabel(/^name$/i)).toHaveValue(opts.clientName);
  await form.getByRole("button", { name: /confirm reservation/i }).click();
  await expect(page.getByRole("heading", { name: /you.?re booked/i })).toBeVisible({
    timeout: 20_000,
  });
  return bookedDate;
}
