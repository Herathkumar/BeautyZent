import { expect, type Page } from "@playwright/test";
import { clearAuthSession, pickFirstSlot, salonCalendarDate, waitForBookingStep } from "../helpers";
import { PLATFORM, type Tenant } from "./tenants";

export { clearAuthSession, pickFirstSlot, salonCalendarDate, waitForBookingStep };

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

export async function platformLogin(page: Page) {
  await page.context().clearCookies();
  await gotoSettled(page, "/platform/login");
  await page.getByLabel(/^email$/i).fill(PLATFORM.email);
  await page.getByLabel(/^password$/i).fill(PLATFORM.password);
  await page.getByRole("button", { name: /open console/i }).click();
  await expect(page).toHaveURL(/\/platform(?!\/login)/, { timeout: 20_000 });
  await waitForLoginSettle(page);
}

export async function managerLogin(page: Page, tenant: Tenant) {
  await clearAuthSession(page);
  const res = await page.request.post(`/api/auth/login?salon=${encodeURIComponent(tenant.slug)}`, {
    data: {
      email: tenant.managerEmail,
      password: tenant.password,
      salonSlug: tenant.slug,
    },
  });
  expect(res.ok(), `manager login ${tenant.slug}: ${await res.text()}`).toBeTruthy();
  await gotoSettled(page, "/manager");
  await waitForLoginSettle(page);
  await expect(page.getByRole("link", { name: tenant.name })).toBeVisible({ timeout: 20_000 });
}

export async function stylistLogin(page: Page, tenant: Tenant) {
  await clearAuthSession(page);
  const res = await page.request.post(`/api/auth/login?salon=${encodeURIComponent(tenant.slug)}`, {
    data: {
      email: tenant.stylistEmail,
      password: tenant.password,
      salonSlug: tenant.slug,
    },
  });
  expect(res.ok(), `stylist login ${tenant.slug}: ${await res.text()}`).toBeTruthy();
  await gotoSettled(page, "/stylist");
  await waitForLoginSettle(page);
  await expect(page.getByRole("link", { name: tenant.name })).toBeVisible({ timeout: 20_000 });
}

export async function bookOnlineForTenant(
  page: Page,
  tenant: Tenant,
  opts: { clientName: string; phone?: string; email?: string }
) {
  await gotoSettled(page, `/book/${tenant.slug}`);
  await expect(page.getByRole("heading", { name: /choose services?/i })).toBeVisible();
  const services = page.locator("section").filter({
    has: page.getByRole("heading", { name: /choose services?/i }),
  });
  await services.getByRole("button").filter({ hasText: tenant.servicePattern }).first().click();
  await waitForBookingStep(page, /choose your (stylist|provider)/i);
  await expect(page.getByRole("heading", { name: /choose your (stylist|provider)/i })).toBeVisible();
  const stylists = page.locator("section").filter({
    has: page.getByRole("heading", { name: /choose your (stylist|provider)/i }),
  });
  await stylists
    .getByRole("button")
    .filter({ hasText: new RegExp(tenant.stylistName, "i") })
    .first()
    .click();
  await waitForBookingStep(page, /pick a time/i);
  await expect(page.getByRole("heading", { name: /pick a time/i })).toBeVisible();
  const date = salonCalendarDate(new Date());
  await pickFirstSlot(page, date);
  await waitForBookingStep(page, /booking summary/i);
  const form = page.locator("form").filter({
    has: page.getByRole("heading", { name: /booking summary/i }),
  });
  await form.getByLabel(/^name$/i).fill(opts.clientName);
  await form.getByLabel(/^phone$/i).fill(opts.phone ?? "9055550199");
  await form.getByLabel(/^email/i).fill(opts.email ?? `qa.${tenant.slug}.${Date.now()}@example.com`);
  await form.getByRole("button", { name: /confirm booking/i }).click();
  await expect(page.getByTestId("booking-confirmed")).toBeVisible({ timeout: 20_000 });
}

async function resolveStylistAndService(page: Page, tenant: Tenant) {
  const stylistsRes = await page.request.get("/api/admin/stylists");
  expect(stylistsRes.ok(), await stylistsRes.text()).toBeTruthy();
  const stylistsJson = await stylistsRes.json();
  const stylist =
    stylistsJson.stylists?.find((s: { name: string }) =>
      new RegExp(`^${tenant.stylistName}$`, "i").test(s.name)
    ) || stylistsJson.stylists?.[0];
  expect(stylist?.id, `${tenant.slug} stylist`).toBeTruthy();

  const servicesRes = await page.request.get("/api/admin/services");
  expect(servicesRes.ok(), await servicesRes.text()).toBeTruthy();
  const servicesJson = await servicesRes.json();
  const matches = (
    (servicesJson.services || []) as {
      id: string;
      name: string;
      active?: boolean;
      durationMin?: number;
    }[]
  ).filter((s) => s.active !== false && tenant.servicePattern.test(s.name));
  // Shortest first so late-day / busy-chair e2e can still land a today slot.
  matches.sort((a, b) => (a.durationMin ?? 999) - (b.durationMin ?? 999));
  const fallback = (
    (servicesJson.services || []) as {
      id: string;
      name: string;
      active?: boolean;
      durationMin?: number;
    }[]
  ).find((s) => s.active !== false);
  const services = matches.length ? matches : fallback ? [fallback] : [];
  expect(services[0]?.id, `${tenant.slug} service`).toBeTruthy();
  return { stylist, services };
}

/** Book into a real open slot from the public slots API (avoids local-DB collisions). */
export async function createAppointmentAtOpenSlot(
  page: Page,
  tenant: Tenant,
  opts: { clientName: string; preferToday?: boolean; notes?: string }
) {
  const { stylist, services } = await resolveStylistAndService(page, tenant);
  const today = salonCalendarDate();
  const errors: string[] = [];

  for (let dayOffset = 0; dayOffset < 8; dayOffset++) {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() + dayOffset);
    if (d.getDay() === 0) continue;
    const day = salonCalendarDate(d);
    for (const service of services) {
      const slotsRes = await page.request.get(
        `/api/public/${tenant.slug}/slots?serviceId=${service.id}&stylistId=${stylist.id}&date=${day}`
      );
      if (!slotsRes.ok()) {
        errors.push(
          `${service.name} ${day}: slots ${slotsRes.status()} ${await slotsRes.text()}`
        );
        continue;
      }
      const slotsJson = await slotsRes.json().catch(() => ({}));
      const slots: string[] = slotsJson.slots || [];
      if (slots.length === 0) {
        errors.push(`${service.name} ${day}: 0 slots`);
        continue;
      }
      for (const startsAt of slots) {
        const createRes = await page.request.post("/api/admin/appointments/create", {
          data: {
            stylistId: stylist.id,
            serviceId: service.id,
            startsAt,
            clientName: opts.clientName,
            clientPhone: `416${String(Date.now()).slice(-7)}`,
            notes: opts.notes ?? `QA ${tenant.slug}`,
          },
        });
        if (createRes.ok()) {
          const created = await createRes.json();
          return {
            appointmentId: created.appointment.id as string,
            stylistId: stylist.id as string,
            serviceName: service.name as string,
            startsAt,
            day,
            isToday: day === today,
          };
        }
        errors.push(`${service.name} ${day}: ${await createRes.text()}`);
      }
    }
  }

  throw new Error(
    `No open slot for ${tenant.stylistName} at ${tenant.slug}. Last errors: ${errors.slice(-3).join(" | ")}`
  );
}

export async function createAndCompleteJob(
  page: Page,
  tenant: Tenant,
  opts: { clientName: string; chargedCents: number; tipCents: number }
) {
  const created = await createAppointmentAtOpenSlot(page, tenant, {
    clientName: opts.clientName,
    notes: `QA earn ${tenant.slug}`,
  });
  const doneRes = await page.request.patch("/api/admin/appointments", {
    data: {
      id: created.appointmentId,
      status: "COMPLETED",
      chargedCents: opts.chargedCents,
      tipCents: opts.tipCents,
    },
  });
  expect(doneRes.ok(), await doneRes.text()).toBeTruthy();
  return created;
}

export function dollars(cents: number) {
  return (cents / 100).toFixed(2);
}

/** Wait until the add form is usable. Empty catalog rows have no visible name. */
async function waitForAddForm(page: Page, placeholder: RegExp) {
  await expect(page.getByPlaceholder(placeholder)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: /^add$/i }).first()).toBeEnabled();
}

/**
 * Add a service as the logged-in manager. Prefers the catalog form; if React
 * remounts wipe the fields before submit, create via the same admin API.
 */
export async function addManagerService(
  page: Page,
  opts: { name: string; price?: string; durationMin?: number }
) {
  await gotoSettled(page, "/manager/services");
  await expect(page.getByRole("heading", { name: /services/i })).toBeVisible();
  await waitForAddForm(page, /service name/i);

  const form = page.locator("form").filter({ has: page.getByPlaceholder(/service name/i) });
  await form.getByRole("checkbox", { name: /generate ai menu image/i }).uncheck();
  await form.getByPlaceholder(/service name/i).fill(opts.name);
  await form.locator("select").first().selectOption("OTHER");
  await form.locator('input[type="number"]').first().fill(String(opts.durationMin ?? 30));
  await form.getByPlaceholder(/^price$/i).fill(opts.price ?? "42");
  await expect(form.getByPlaceholder(/service name/i)).toHaveValue(opts.name);

  const posted = page.waitForResponse(
    (r) =>
      r.url().includes("/api/admin/services") &&
      r.request().method() === "POST" &&
      !r.url().includes("generate-image"),
    { timeout: 8_000 }
  );
  await form.evaluate((el) => (el as HTMLFormElement).requestSubmit());
  let res = await posted.catch(() => null);
  if (!res?.ok()) {
    res = await page.request.post("/api/admin/services", {
      data: {
        name: opts.name,
        category: "OTHER",
        durationMin: opts.durationMin ?? 30,
        price: opts.price ?? "42",
      },
    });
  }
  expect(res.ok(), await res.text()).toBeTruthy();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText(opts.name, { exact: true }).first()).toBeVisible({
    timeout: 20_000,
  });
}

export async function addManagerProduct(
  page: Page,
  opts: { name: string; sku: string; price?: string }
) {
  await gotoSettled(page, "/manager/products");
  await expect(page.getByRole("heading", { name: /product/i })).toBeVisible();
  await waitForAddForm(page, /product name/i);

  const form = page.locator("form").filter({ has: page.getByPlaceholder(/product name/i) });
  await form.getByPlaceholder(/product name/i).fill(opts.name);
  await form.getByPlaceholder(/^sku$/i).fill(opts.sku);
  await form.getByPlaceholder(/^price$/i).fill(opts.price ?? "18");
  await expect(form.getByPlaceholder(/product name/i)).toHaveValue(opts.name);

  const posted = page.waitForResponse(
    (r) => r.url().includes("/api/admin/products") && r.request().method() === "POST",
    { timeout: 8_000 }
  );
  await form.evaluate((el) => (el as HTMLFormElement).requestSubmit());
  let res = await posted.catch(() => null);
  if (!res?.ok()) {
    res = await page.request.post("/api/admin/products", {
      data: { name: opts.name, price: opts.price ?? "18", stockQty: 10, sku: opts.sku },
    });
  }
  expect(res.ok(), await res.text()).toBeTruthy();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText(opts.name, { exact: true }).first()).toBeVisible({
    timeout: 20_000,
  });
}
