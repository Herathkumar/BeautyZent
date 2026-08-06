import { test, expect, type Browser } from "@playwright/test";
import { adminLogin, DEMO, joinAsMember, nextOpenDate } from "./helpers";

/** 1×1 PNG — small but decodable by the browser-side resizer. */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

function uniqueContact(tag: string) {
  const stamp = Date.now();
  return {
    name: `QA ${tag} ${stamp}`,
    email: `qa.${tag}.${stamp}@example.com`,
    // Unique so the admin create endpoint matches this member, not an old one.
    phone: `905${String(stamp).slice(-7)}`,
  };
}

/**
 * Book a visit in the past for an existing member. Online booking only offers
 * future slots, so this goes through the manager desk API in its own context.
 */
async function createPastVisit(
  browser: Browser,
  contact: { name: string; email: string; phone: string }
) {
  const ctx = await browser.newContext();
  const manager = await ctx.newPage();
  try {
    await adminLogin(manager);

    const catalog = await (
      await manager.request.get(`/api/public/${DEMO.slug}/catalog`)
    ).json();
    const service = catalog.services[0];
    const stylist = catalog.stylists[0];
    expect(service?.id, "seed service").toBeTruthy();
    expect(stylist?.id, "seed stylist").toBeTruthy();

    // Early morning, three days back — outside seeded hours, so no conflicts.
    const startsAt = new Date();
    startsAt.setDate(startsAt.getDate() - 3);
    startsAt.setHours(6, 5, 0, 0);

    const res = await manager.request.post("/api/admin/appointments/create", {
      data: {
        stylistId: stylist.id,
        serviceId: service.id,
        startsAt: startsAt.toISOString(),
        clientName: contact.name,
        clientPhone: contact.phone,
        clientEmail: contact.email,
        notes: "Look book QA — past visit",
      },
    });
    expect(res.ok(), `create past visit: ${await res.text()}`).toBeTruthy();
    return (await res.json()).appointment;
  } finally {
    await ctx.close();
  }
}

test.describe("Client look book", () => {
  test("app tab bar switches between Book, Visits and Look book", async ({ page }) => {
    await page.goto(`/book/${DEMO.slug}`);

    await expect(page.getByTestId("book-nav-book")).toBeVisible();
    await expect(page.getByTestId("book-nav-lookbook")).toBeVisible();

    // Guests get the sign-in form instead of an empty member sheet
    await page.getByTestId("book-nav-lookbook").click();
    await expect(page.getByRole("button", { name: /email me a code/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("dialog", { name: /my bookings/i })).toHaveCount(0);
  });

  test("member uploads a photo to a past visit and sees it in the look book", async ({
    page,
    browser,
  }) => {
    const contact = uniqueContact("look");
    await joinAsMember(page, contact);
    const appointment = await createPastVisit(browser, contact);

    await expect(page.getByRole("button", { name: /^sign out$/i })).toBeVisible();
    await page.getByTestId("book-nav-lookbook").click();

    const sheet = page.getByRole("dialog", { name: /my bookings/i });
    await expect(sheet).toBeVisible({ timeout: 15_000 });
    await expect(sheet.getByRole("heading", { name: /my look book/i })).toBeVisible();
    await expect(sheet.getByTestId("look-photo-add").first()).toBeVisible({
      timeout: 15_000,
    });

    await sheet
      .getByTestId("look-photo-input")
      .first()
      .setInputFiles({ name: "look.png", mimeType: "image/png", buffer: TINY_PNG });

    await expect(sheet.getByTestId("look-photo-thumb").first()).toBeVisible({
      timeout: 20_000,
    });

    // Persisted, not just optimistic UI
    const listed = await page.request.get(
      `/api/public/${DEMO.slug}/my-bookings/${appointment.id}/photos`
    );
    expect(listed.ok()).toBeTruthy();
    const body = await listed.json();
    expect(body.photos.length).toBe(1);

    // Open the viewer, save a note, then delete
    await sheet.getByTestId("look-photo-thumb").first().click();
    const viewer = page.getByTestId("look-photo-viewer");
    await expect(viewer).toBeVisible();
    await viewer.getByPlaceholder(/add a note/i).fill("Skin fade, 1.5 on sides");
    await viewer.getByRole("button", { name: /save note/i }).click();

    await expect
      .poll(async () => {
        const r = await page.request.get(
          `/api/public/${DEMO.slug}/my-bookings/${appointment.id}/photos`
        );
        return (await r.json()).photos[0]?.caption;
      }, { timeout: 15_000 })
      .toBe("Skin fade, 1.5 on sides");
  });

  test("photo upload is rejected for guests and for future visits", async ({
    page,
    request,
  }) => {
    const guest = await request.post(
      `/api/public/${DEMO.slug}/my-bookings/does-not-exist/photos`,
      { data: { imageBase64: TINY_PNG.toString("base64") } }
    );
    expect(guest.status()).toBe(401);

    const contact = uniqueContact("future");
    await joinAsMember(page, contact);

    // A booking that hasn't happened yet must not accept photos
    const catalog = await (await page.request.get(`/api/public/${DEMO.slug}/catalog`)).json();
    const slots = await (
      await page.request.get(
        `/api/public/${DEMO.slug}/slots?serviceId=${catalog.services[0].id}&stylistId=${catalog.stylists[0].id}&date=${nextOpenDate()}`
      )
    ).json();
    expect(slots.slots?.length, "open slot for future booking").toBeTruthy();

    const booked = await page.request.post(`/api/public/${DEMO.slug}/book`, {
      data: {
        serviceId: catalog.services[0].id,
        stylistId: catalog.stylists[0].id,
        startsAt: slots.slots[0],
        clientName: contact.name,
        clientPhone: contact.phone,
        clientEmail: contact.email,
      },
    });
    expect(booked.ok(), await booked.text()).toBeTruthy();
    const { appointment } = await booked.json();

    const res = await page.request.post(
      `/api/public/${DEMO.slug}/my-bookings/${appointment.id}/photos`,
      { data: { imageBase64: TINY_PNG.toString("base64") } }
    );
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/after your visit/i);
  });
});
