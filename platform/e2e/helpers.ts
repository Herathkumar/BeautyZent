import { expect, type Locator, type Page } from "@playwright/test";

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

/** Login uses window.location.assign — wait it out or the next goto is aborted. */
async function waitForLoginSettle(page: Page) {
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  await page.waitForLoadState("load").catch(() => undefined);
}

async function looksLikeNext404(page: Page) {
  const heading = await page.locator("h1, h2").first().innerText().catch(() => "");
  return /404|this page could not be found/i.test(heading);
}

export async function gotoSettled(page: Page, url: string) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 });
      await page.waitForLoadState("load").catch(() => undefined);
      if (res?.status() === 404 || (await looksLikeNext404(page))) {
        await page.waitForTimeout(400 * (attempt + 1));
        continue;
      }
      return;
    } catch (err) {
      const msg = String(err);
      if (!msg.includes("ERR_ABORTED") && !msg.includes("interrupted")) throw err;
      await page.waitForTimeout(400 * (attempt + 1));
    }
  }
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 });
  await page.waitForLoadState("load").catch(() => undefined);
}

async function staffLogin(
  page: Page,
  opts: { email: string; password: string; dest: "/manager" | "/stylist" }
) {
  await clearAuthSession(page);
  const res = await page.request.post(`/api/auth/login?salon=${encodeURIComponent(DEMO.slug)}`, {
    data: {
      email: opts.email,
      password: opts.password,
      salonSlug: DEMO.slug,
    },
  });
  expect(res.ok(), `staff login ${opts.email}: ${await res.text()}`).toBeTruthy();
  await gotoSettled(page, opts.dest);
  await waitForLoginSettle(page);
  await expect(page).toHaveURL(new RegExp(`${opts.dest}(?!/login)`), { timeout: 20_000 });
}

export async function adminLogin(page: Page) {
  await staffLogin(page, {
    email: DEMO.adminEmail,
    password: DEMO.password,
    dest: "/manager",
  });
}

export async function receptionLogin(page: Page) {
  await clearAuthSession(page);
  const res = await page.request.post(`/api/auth/login?salon=${encodeURIComponent(DEMO.slug)}`, {
    data: {
      email: DEMO.adminEmail,
      password: DEMO.password,
      salonSlug: DEMO.slug,
    },
  });
  expect(res.ok(), `reception login: ${await res.text()}`).toBeTruthy();
  await page.goto(`/display/${DEMO.slug}/reception`, {
    waitUntil: "domcontentloaded",
    timeout: 20_000,
  });
  await expect(page.getByTestId("reception-signed-in")).toBeVisible({ timeout: 30_000 });
}

/**
 * Set a date input so React controlled `onChange` fires.
 * Playwright `fill()` can update the DOM without committing React state.
 */
export async function fillDateInput(locator: Locator, ymd: string) {
  await locator.evaluate((el, value) => {
    const input = el as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, ymd);
  await expect(locator).toHaveValue(ymd);
}

/** Accept the themed in-app confirm dialog (replaces native window.confirm). */
export async function acceptConfirm(page: Page) {
  const dialog = page.getByTestId("confirm-dialog");
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await dialog.getByTestId("confirm-dialog-ok").click({ force: true });
  await expect(dialog).toHaveCount(0);
}

/** Join the booking app as a member via the demo OTP code shown on screen. */
export async function joinAsMember(
  page: Page,
  opts: { name: string; phone: string; email: string }
) {
  await gotoSettled(page, `/book/${DEMO.slug}`);

  // Join lives under Profile for guests (no top-level Join free on the wizard).
  const joinOnPage = page.getByRole("button", { name: /^join free$/i }).first();
  if (!(await joinOnPage.isVisible({ timeout: 2_000 }).catch(() => false))) {
    await page.getByRole("button", { name: /^profile$/i }).click();
    const profile = page.getByTestId("book-profile");
    await expect(profile).toBeVisible({ timeout: 10_000 });
    await profile.getByRole("button", { name: /^join free$/i }).click();
  } else {
    await joinOnPage.click();
  }

  await page.getByLabel(/^name$/i).fill(opts.name);
  await page.getByLabel(/^phone$/i).fill(opts.phone);
  await page.getByLabel(/^email$/i).fill(opts.email);
  const codeSent = page.waitForResponse(
    (r) => r.url().includes("/auth/request-otp") && r.request().method() === "POST",
    { timeout: 40_000 }
  );
  await page.getByRole("button", { name: /email me a code/i }).click();
  await codeSent;

  const demoCode = page.locator("text=/Demo code:/i");
  await expect(demoCode).toBeVisible({ timeout: 15_000 });
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

/** Drop auth cookies and leave the current SPA so 401 handlers cannot race navigations. */
export async function clearAuthSession(page: Page) {
  await page.context().clearCookies();
  await page.goto("about:blank");
}

export async function stylistLogin(page: Page) {
  await staffLogin(page, {
    email: DEMO.stylistEmail,
    password: DEMO.password,
    dest: "/stylist",
  });
}

/** Book into a real open slot so local-DB collisions do not 409. */
export async function createAppointmentAtOpenSlot(
  page: Page,
  opts: { clientName: string; stylistName?: RegExp; notes?: string }
) {
  const stylistsRes = await page.request.get("/api/admin/stylists");
  expect(stylistsRes.ok(), await stylistsRes.text()).toBeTruthy();
  const stylistsJson = await stylistsRes.json();
  const nameRe = opts.stylistName ?? /farzana/i;
  const stylist =
    stylistsJson.stylists?.find((s: { name: string }) => nameRe.test(s.name)) ||
    stylistsJson.stylists?.[0];
  expect(stylist?.id, "stylist").toBeTruthy();

  const servicesRes = await page.request.get("/api/admin/services");
  expect(servicesRes.ok(), await servicesRes.text()).toBeTruthy();
  const servicesJson = await servicesRes.json();
  const service =
    servicesJson.services?.find((s: { active?: boolean }) => s.active !== false) ||
    servicesJson.services?.[0];
  expect(service?.id, "service").toBeTruthy();

  const today = salonCalendarDate();
  const errors: string[] = [];
  for (let dayOffset = 0; dayOffset < 8; dayOffset++) {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() + dayOffset);
    if (d.getDay() === 0) continue;
    const day = salonCalendarDate(d);
    const slotsRes = await page.request.get(
      `/api/public/${DEMO.slug}/slots?serviceId=${service.id}&stylistId=${stylist.id}&date=${day}`
    );
    const slotsJson = await slotsRes.json().catch(() => ({}));
    const slots: string[] = slotsJson.slots || [];
    for (const startsAt of slots) {
      const createRes = await page.request.post("/api/admin/appointments/create", {
        data: {
          stylistId: stylist.id,
          serviceId: service.id,
          startsAt,
          clientName: opts.clientName,
          clientPhone: `416555${String(Date.now()).slice(-4)}`,
          notes: opts.notes ?? "QA",
        },
      });
      if (createRes.ok()) {
        const created = await createRes.json();
        return { appointmentId: created.appointment.id as string, startsAt, day };
      }
      errors.push(`${day}: ${await createRes.text()}`);
    }
  }
  throw new Error(`No open slot. Last errors: ${errors.slice(-3).join(" | ")}`);
}

/**
 * Cancel today's open bookings for a stylist so late-day walk-in e2e still has a chair.
 * Requires an active manager session on `page` (or request context cookies).
 */
export async function clearOpenBookingsForStylist(
  page: Page,
  stylistName: RegExp | string
) {
  let list: Awaited<ReturnType<Page["request"]["get"]>> | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      list = await page.request.get(`/api/admin/appointments?status=open&days=14`);
      break;
    } catch (err) {
      if (attempt === 2) throw err;
      await page.waitForTimeout(400 * (attempt + 1));
    }
  }
  expect(list?.ok(), `list open bookings: ${await list?.text()}`).toBeTruthy();
  const data = await list!.json();
  const nameRe =
    typeof stylistName === "string"
      ? new RegExp(stylistName, "i")
      : stylistName;
  const mine = (data.appointments || []).filter((a: { stylist?: { name?: string } }) =>
    nameRe.test(a.stylist?.name || "")
  );
  for (const a of mine) {
    const cancel = await page.request.patch("/api/admin/appointments", {
      data: { id: a.id, status: "CANCELLED" },
    });
    expect(cancel.ok(), `cancel ${a.id}: ${await cancel.text()}`).toBeTruthy();
  }
}

export async function pickFirstSlot(page: Page, startDate: string) {
  const timeSection = page.locator("section").filter({
    has: page.getByRole("heading", { name: /pick a time/i }),
  });
  const wizardVisible = await timeSection
    .getByRole("heading", { name: /pick a time/i })
    .isVisible()
    .catch(() => false);
  const dateInput = wizardVisible
    ? timeSection.locator('input[type="date"]')
    : page.locator("form input[type='date']").first();
  const slotRoot = wizardVisible ? timeSection : page.locator("form");
  const usesDateStrip = wizardVisible && (await dateInput.count()) === 0;

  if (!usesDateStrip) {
    await expect(dateInput).toBeVisible({ timeout: 15_000 });
  }

  for (let attempt = 0; attempt < 10; attempt++) {
    const d = new Date(startDate + "T12:00:00");
    d.setDate(d.getDate() + attempt);
    if (d.getDay() === 0) continue;
    const dateStr = formatDate(d);

    if (usesDateStrip) {
      const dayBtn = timeSection.locator(`[data-date="${dateStr}"]`);
      const visible = await dayBtn.isVisible().catch(() => false);
      if (!visible) {
        const monthBtn = timeSection.locator(".book-date-strip__month");
        if (await monthBtn.isVisible().catch(() => false)) {
          await monthBtn.click();
          const calDay = timeSection.locator(".book-luxe-calendar__day").filter({
            hasText: new RegExp(`^${Number(dateStr.split("-")[2])}$`),
          });
          for (let m = 0; m < 6; m++) {
            if (await calDay.first().isVisible().catch(() => false)) break;
            const next = timeSection.getByRole("button", { name: /next month/i });
            if (!(await next.isEnabled().catch(() => false))) break;
            await next.click();
          }
          if (await calDay.first().isVisible().catch(() => false)) {
            await calDay.first().click();
          }
        }
      }
      const nextWeek = timeSection.getByRole("button", { name: /next week/i });
      for (let w = 0; w < 14 && !(await dayBtn.isVisible().catch(() => false)); w++) {
        await nextWeek.click();
        await dayBtn.scrollIntoViewIfNeeded().catch(() => undefined);
      }
      const onStrip = await dayBtn.isVisible().catch(() => false);
      if (onStrip) {
        const slotsLoaded = page.waitForResponse(
          (r) => r.url().includes("/slots") && r.url().includes(`date=${dateStr}`) && r.ok(),
          { timeout: 15_000 }
        );
        await dayBtn.click();
        await slotsLoaded.catch(() => undefined);
      } else {
        const fallback = timeSection.locator(".book-date-strip__day:not([disabled])").first();
        await expect(fallback).toBeVisible({ timeout: 8_000 });
        await fallback.click();
        await page
          .waitForResponse((r) => r.url().includes("/slots") && r.ok(), { timeout: 8_000 })
          .catch(() => undefined);
      }
    } else {
      const current = await dateInput.inputValue();
      if (current !== dateStr) {
        const slotsLoaded = page.waitForResponse(
          (r) => r.url().includes("/slots") && r.url().includes(`date=${dateStr}`) && r.ok(),
          { timeout: 15_000 }
        );
        await fillDateInput(dateInput, dateStr);
        const slotsOk = await slotsLoaded.then(() => true).catch(() => false);
        if (!slotsOk) continue;
      } else {
        await page
          .waitForResponse(
            (r) => r.url().includes("/slots") && r.url().includes(`date=${dateStr}`) && r.ok(),
            { timeout: 8_000 }
          )
          .catch(() => undefined);
      }
    }

    const slotButtons = slotRoot.locator(`[data-slot-day="${dateStr}"]`);
    const appeared = await slotButtons
      .first()
      .waitFor({ state: "visible", timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    if (!appeared) {
      const anySlot = slotRoot.locator("[data-slot-day]").first();
      const anyVisible = await anySlot
        .waitFor({ state: "visible", timeout: 4_000 })
        .then(() => true)
        .catch(() => false);
      if (anyVisible) {
        await anySlot.click();
        return dateStr;
      }
      continue;
    }
    await slotButtons.first().click();
    return dateStr;
  }
  throw new Error(`No open slots found starting from ${startDate}`);
}

const PROVIDER_HEADING = /choose your (stylist|provider)/i;

/** Wizard advances via Continue (services step has autoAdvance=false) or ~1s auto-advance. */
export async function waitForBookingStep(
  page: Page,
  heading: RegExp,
  timeout = 15_000
) {
  await expect(page.getByRole("heading", { name: heading })).toBeVisible({ timeout });
}

/** After selecting service(s), click Continue to Provider when shown. */
export async function continueBookingToProvider(page: Page) {
  const continueBtn = page.getByRole("button", { name: /continue to\s*provider/i });
  if (await continueBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await continueBtn.click();
  }
  await waitForBookingStep(page, PROVIDER_HEADING);
}

/** After selecting a provider, wait for time step (auto-advances when enabled). */
export async function continueBookingToTime(page: Page) {
  const continueBtn = page.getByRole("button", { name: /continue to\s*time/i });
  if (await continueBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await continueBtn.click();
  }
  await waitForBookingStep(page, /pick a time/i);
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

  await gotoSettled(page, `/book/${DEMO.slug}`);
  await expect(page.getByRole("heading", { name: /choose services?/i })).toBeVisible();
  // Scope to wizard — Style preview AI chips can match /beard/i before services load
  const services = page.locator("section").filter({
    has: page.getByRole("heading", { name: /choose services?/i }),
  });
  await services.getByRole("button").filter({ hasText: servicePattern }).first().click();
  await continueBookingToProvider(page);
  await expect(page.getByRole("heading", { name: PROVIDER_HEADING })).toBeVisible();
  const stylists = page.locator("section").filter({
    has: page.getByRole("heading", { name: PROVIDER_HEADING }),
  });
  await stylists
    .getByRole("button")
    .filter({ has: page.getByText(stylistPattern) })
    .filter({ hasNotText: /any available/i })
    .first()
    .click();
  await continueBookingToTime(page);
  await expect(page.getByRole("heading", { name: /pick a time/i })).toBeVisible();
  const bookedDate = await pickFirstSlot(page, date);
  await waitForBookingStep(page, /booking summary/i);
  const form = page.locator("form").filter({
    has: page.getByRole("heading", { name: /booking summary/i }),
  });
  await form.getByLabel(/^name$/i).fill(opts.clientName);
  await form.getByLabel(/^phone$/i).fill(opts.phone ?? "9055550100");
  // "Save my profile" is checked by default and requires email
  await form
    .getByLabel(/^email/i)
    .fill(opts.email ?? `qa.guest.${Date.now()}@example.com`);
  if (opts.notes) await form.getByLabel(/special requests/i).fill(opts.notes);
  await expect(form.getByLabel(/^name$/i)).toHaveValue(opts.clientName);
  await form.getByRole("button", { name: /confirm booking/i }).click();
  await expect(page.getByTestId("booking-confirmed")).toBeVisible({
    timeout: 20_000,
  });
  return bookedDate;
}
