import { expect, test, type APIRequestContext } from "@playwright/test";

async function joinMember(request: APIRequestContext, label: string) {
  const email = `${label}-${Date.now()}-${test.info().workerIndex}@example.test`;
  const join = await request.post("/api/public/fhsalon/auth/request-otp", {
    data: {
      email,
      purpose: "join",
      name: "Marketplace Member",
      phone: "4165550198",
    },
  });
  expect(join.ok(), await join.text()).toBeTruthy();
  const joinData = await join.json();
  expect(joinData.demoCode).toMatch(/^\d{6}$/);

  const verify = await request.post("/api/public/fhsalon/auth/verify-otp", {
    data: { email, code: joinData.demoCode },
  });
  expect(verify.ok(), await verify.text()).toBeTruthy();
  return email;
}

function futureDate(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

test.describe("unified consumer account", () => {
  test("protects account data when signed out", async ({ request }) => {
    const account = await request.get("/api/public/account");
    expect(account.status()).toBe(401);

    const bookings = await request.get("/api/public/account/bookings");
    expect(bookings.status()).toBe(401);

    const favorite = await request.post(
      "/api/public/account/favorites/not-a-business"
    );
    expect(favorite.status()).toBe(401);
  });

  test("manages profile and favorites through one consumer session", async ({
    request,
  }) => {
    const email = await joinMember(request, "account");

    const account = await request.get("/api/public/account");
    expect(account.ok(), await account.text()).toBeTruthy();
    const accountData = await account.json();
    expect(accountData.account.email).toBe(email);
    expect(accountData.memberships.length).toBeGreaterThan(0);
    expect(accountData.favorites).toEqual([]);

    const salonId = accountData.memberships[0].salonId as string;
    const save = await request.post(
      `/api/public/account/favorites/${salonId}`
    );
    expect(save.ok(), await save.text()).toBeTruthy();

    const duplicate = await request.post(
      `/api/public/account/favorites/${salonId}`
    );
    expect(duplicate.ok(), await duplicate.text()).toBeTruthy();

    const session = await request.get("/api/public/account/session");
    expect(session.ok()).toBeTruthy();
    const sessionData = await session.json();
    expect(sessionData.signedIn).toBe(true);
    expect(sessionData.favoriteSalonIds).toContain(salonId);

    const update = await request.patch("/api/public/account", {
      data: { name: "Updated Marketplace Member", phone: "6475550142" },
    });
    expect(update.ok(), await update.text()).toBeTruthy();

    const updated = await request.get("/api/public/account");
    const updatedData = await updated.json();
    expect(updatedData.account.name).toBe("Updated Marketplace Member");
    expect(updatedData.account.phone).toBe("6475550142");
    expect(updatedData.favorites.map((item: { id: string }) => item.id)).toContain(
      salonId
    );

    const remove = await request.delete(
      `/api/public/account/favorites/${salonId}`
    );
    expect(remove.ok(), await remove.text()).toBeTruthy();

    const removed = await request.get("/api/public/account");
    const removedData = await removed.json();
    expect(removedData.favorites).toEqual([]);

    const otherBooking = await request.post(
      "/api/public/account/bookings/not-owned/cancel"
    );
    expect(otherBooking.status()).toBe(404);
  });

  test("reschedules and cancels an owned booking", async ({ request }) => {
    const email = await joinMember(request, "booking");
    const catalogRes = await request.get("/api/public/fhsalon/catalog");
    expect(catalogRes.ok(), await catalogRes.text()).toBeTruthy();
    const catalog = await catalogRes.json();
    const service = catalog.services[0];
    expect(service?.id).toBeTruthy();

    let originalSlot = "";
    for (let day = 2; day <= 16 && !originalSlot; day += 1) {
      const slotsRes = await request.get(
        `/api/public/fhsalon/slots?serviceId=${service.id}&stylistId=__any__&date=${futureDate(day)}`
      );
      const slotsData = await slotsRes.json();
      originalSlot = slotsData.slots?.[0] || "";
    }
    expect(originalSlot, "Expected an open booking slot").toBeTruthy();

    const book = await request.post("/api/public/fhsalon/book", {
      data: {
        serviceId: service.id,
        stylistId: "__any__",
        startsAt: originalSlot,
        clientName: "Marketplace Member",
        clientPhone: "4165550198",
        clientEmail: email,
        saveAsMember: true,
      },
    });
    expect(book.ok(), await book.text()).toBeTruthy();

    const list = await request.get("/api/public/account/bookings");
    expect(list.ok(), await list.text()).toBeTruthy();
    const listData = await list.json();
    const booking = listData.bookings.find(
      (item: { status: string }) => item.status === "BOOKED"
    );
    expect(booking?.canReschedule).toBe(true);

    let nextSlot = "";
    for (let day = 17; day <= 30 && !nextSlot; day += 1) {
      const slotsRes = await request.get(
        `/api/public/account/bookings/${booking.id}/reschedule?date=${futureDate(day)}`
      );
      const slotsData = await slotsRes.json();
      nextSlot = slotsData.slots?.[0] || "";
    }
    expect(nextSlot, "Expected a slot for rescheduling").toBeTruthy();

    const reschedule = await request.post(
      `/api/public/account/bookings/${booking.id}/reschedule`,
      { data: { startsAt: nextSlot } }
    );
    expect(reschedule.ok(), await reschedule.text()).toBeTruthy();

    const changed = await request.get("/api/public/account/bookings");
    const changedData = await changed.json();
    const moved = changedData.bookings.find(
      (item: { id: string }) => item.id === booking.id
    );
    expect(new Date(moved.startsAt).getTime()).toBe(new Date(nextSlot).getTime());

    const cancel = await request.post(
      `/api/public/account/bookings/${booking.id}/cancel`
    );
    expect(cancel.ok(), await cancel.text()).toBeTruthy();

    const cancelled = await request.get("/api/public/account/bookings");
    const cancelledData = await cancelled.json();
    const final = cancelledData.bookings.find(
      (item: { id: string }) => item.id === booking.id
    );
    expect(final.status).toBe("CANCELLED");
  });
});
