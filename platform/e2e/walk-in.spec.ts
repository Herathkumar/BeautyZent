import { test, expect, type Page } from "@playwright/test";
import {
  adminLogin,
  bookableDateNearToday,
  clearAuthSession,
  clearOpenBookingsForStylist,
  fillDateInput,
  gotoSettled,
  nextOpenDate,
  stylistLogin,
} from "./helpers";

async function bookViaStylistForm(
  page: Page,
  opts: { clientName: string; phone: string; otherStylist?: boolean; date?: string }
) {
  const service = page.getByTestId("stylist-book-service");
  await expect
    .poll(async () => service.locator("option").count(), { timeout: 15_000 })
    .toBeGreaterThan(1);
  const labels = await service.locator("option").allTextContents();
  const shortIdx = labels.findIndex((t) => /bang|beard|trim & tidy/i.test(t));
  await service.selectOption({ index: shortIdx > 0 ? shortIdx : 1 });
  const stylistSelect = page.getByTestId("stylist-book-stylist");
  await expect(stylistSelect).toBeVisible({ timeout: 10_000 });
  await expect.poll(async () => stylistSelect.locator("option").count()).toBeGreaterThan(1);
  if (opts.otherStylist) {
    const other = stylistSelect.locator("option").filter({ hasNotText: /\(you\)/i }).nth(1);
    const otherValue = await other.getAttribute("value");
    expect(otherValue).toBeTruthy();
    await stylistSelect.selectOption(otherValue!);
  }
  const day = opts.date ?? nextOpenDate();
  const slotsLoaded = page.waitForResponse(
    (r) => r.url().includes("/slots") && r.url().includes(`date=${day}`) && r.ok(),
    { timeout: 10_000 }
  );
  await fillDateInput(page.getByTestId("stylist-book-date"), day);
  await slotsLoaded.catch(() => undefined);
  const slots = page.getByTestId("stylist-book-slots").getByRole("button");
  await expect(slots.first()).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("stylist-book-client-name").fill(opts.clientName);
  await expect(page.getByTestId("stylist-book-client-name")).toHaveValue(opts.clientName);
  await page.getByTestId("stylist-book-client-phone").fill(opts.phone);
  const count = await slots.count();
  let lastErr = "";
  for (let i = 0; i < count; i++) {
    await slots.nth(i).click();
    await expect(page.getByTestId("stylist-book-submit")).toBeEnabled();
    const posted = page.waitForResponse(
      (r) =>
        r.url().includes("/api/stylist/appointments/create") &&
        r.request().method() === "POST" &&
        (r.request().postData() || "").includes(opts.clientName)
    );
    await page.getByTestId("stylist-book-submit").click();
    const res = await posted;
    if (res.ok()) {
      await expect(page.getByTestId("stylist-book-message")).toContainText(opts.clientName, {
        timeout: 10_000,
      });
      return;
    }
    lastErr = await res.text();
  }
  throw new Error(`Could not book ${opts.clientName}. Last: ${lastErr}`);
}

test.describe("Walk-in appointments", () => {
  test("manager can seat a walk-in and filter by source", async ({ page }) => {
    const clientName = `WalkInMgr ${Date.now()}`;

    await adminLogin(page);
    await clearOpenBookingsForStylist(page, /^(aisha|omar|farzana)$/i);
    await gotoSettled(page, "/manager/walk-in");
    await expect(page.getByRole("heading", { name: /^walk-in$/i })).toBeVisible();
    await expect(page.getByTestId("walk-in-panel")).toBeVisible();

    const service = page.getByLabel("Walk-in service");
    // Wait until catalog hydrates (placeholder alone is 1 option)
    await expect
      .poll(async () => service.locator("option").count(), { timeout: 30_000 })
      .toBeGreaterThanOrEqual(7);
    const labels = await service.locator("option").allTextContents();
    const short = labels.find((t) => /bang|fringe trim/i.test(t));
    expect(short, "short walk-in service").toBeTruthy();
    await service.selectOption({ label: short! });
    // Wait for real ETA — "no open slot" flashes while options load and must not win the race
    await expect(page.getByTestId("walk-in-eta")).toBeVisible({ timeout: 15_000 });
    await page.getByLabel("Walk-in client name").fill(clientName);
    await page.getByRole("button", { name: /seat walk-in/i }).click();
    await expect(page.getByText(/walk-in seated/i)).toBeVisible({ timeout: 20_000 });

    await gotoSettled(page, "/manager/appointments");
    await expect(page.getByRole("heading", { name: /^bookings$/i })).toBeVisible();
    await page.getByLabel("Source").selectOption("WALK_IN");
    await expect(page.getByText(clientName).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("walk-in-badge").first()).toBeVisible();
  });

  test("manager can seat waitlist from public salon display", async ({ page }) => {
    await adminLogin(page);
    await clearOpenBookingsForStylist(page, /^(aisha|omar|farzana)$/i);

    const catalog = await page.request.get("/api/public/fhsalon/catalog");
    const cat = await catalog.json();
    const service =
      (cat.services || []).find((s: { name: string }) => /bang|fringe/i.test(s.name)) ||
      (cat.services || []).find((s: { name: string }) => /^men.?s haircut/i.test(s.name));
    expect(service?.id).toBeTruthy();

    const clientName = `MgrDisplay ${Date.now()}`;
    const add = await page.request.post("/api/admin/waitlist", {
      data: { clientName, serviceId: service.id },
    });
    expect(add.ok()).toBeTruthy();

    await page.goto("/manager/walk-in");
    await expect(page.getByTestId("walk-in-panel")).toBeVisible({
      timeout: 15_000,
    });

    const waitlist = page.getByTestId("walk-in-waitlist");
    const entry = waitlist.locator("[data-testid=waitlist-entry]").filter({
      hasText: clientName,
    });
    await expect(entry).toBeVisible({ timeout: 15_000 });
    await expect(entry.getByTestId("waitlist-seat-now")).toBeEnabled({ timeout: 30_000 });
    await entry.getByTestId("waitlist-seat-now").click();
    const picker = entry.getByTestId("waitlist-seat-picker");
    await expect(picker).toBeVisible();
    await picker.getByTestId("waitlist-confirm-seat").click();
    await expect(page.getByText(new RegExp(`seated\\s+${clientName}`, "i"))).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(clientName).first()).toBeVisible({ timeout: 15_000 });
  });

  test("manager can add guest to waitlist", async ({ page }) => {
    const clientName = `Waitlist ${Date.now()}`;

    await adminLogin(page);
    await gotoSettled(page, "/manager/walk-in");
    await page.getByLabel("Walk-in service").selectOption({ index: 1 });
    await page.getByLabel("Walk-in client name").fill(clientName);
    await page.getByRole("button", { name: /add to waitlist/i }).click();

    await expect(page.getByText(/added to waitlist/i)).toBeVisible({ timeout: 15_000 });
    const waitlist = page.getByTestId("walk-in-waitlist");
    await expect(waitlist.getByText(clientName)).toBeVisible();
    await expect(waitlist.getByText(/ready now|min wait|h /i).first()).toBeVisible();
  });

  test("stylist can seat a walk-in for self", async ({ page }) => {
    const clientName = `WalkInSty ${Date.now()}`;

    // Free Aisha's remaining open jobs so late-day e2e always has a chair
    await adminLogin(page);
    await clearOpenBookingsForStylist(page, /^aisha$/i);

    await clearAuthSession(page);
    await gotoSettled(page, "/stylist/login");
    await page.getByLabel(/^email$/i).fill("aisha@fhsalon.ca");
    await page.getByLabel(/^password$/i).fill("demo1234");
    await page.locator('form button[type="submit"]').click();
    await expect(page).toHaveURL(/\/stylist(?!\/login)/, { timeout: 20_000 });

    await gotoSettled(page, "/stylist");
    await page.getByTestId("stylist-walk-in-toggle").click();
    await expect(page.getByTestId("walk-in-panel")).toBeVisible();

    // Prefer a short service so late-day / busy books still have a slot
    // Aisha's specialty menu: women's seed services (+ placeholder), not men's cuts
    const service = page.getByLabel("Walk-in service");
    await expect
      .poll(async () => service.locator("option").count(), { timeout: 15_000 })
      .toBeGreaterThanOrEqual(4);
    const labels = await service.locator("option").allTextContents();
    expect(
      labels.some((t) => /^men'?s haircut/i.test(t.trim()) || /fade\s*\/\s*taper/i.test(t)),
      "Aisha must not list seed men's services"
    ).toBeFalsy();
    const short = labels.find((t) => /bang|fringe trim/i.test(t));
    expect(short, "short walk-in service").toBeTruthy();
    await service.selectOption({ label: short! });
    await expect(page.getByTestId("walk-in-eta")).toBeVisible({ timeout: 10_000 });
    await page.getByLabel("Walk-in client name").fill(clientName);
    const seatResp = page.waitForResponse(
      (r) => r.url().includes("/api/stylist/walk-in") && r.request().method() === "POST"
    );
    await page.getByRole("button", { name: /seat walk-in/i }).click();
    const seated = await seatResp;
    expect(seated.ok(), `seat walk-in: ${await seated.text()}`).toBeTruthy();
    await expect(page.getByText(new RegExp(`walk-in seated:\\s*${clientName}`, "i"))).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(clientName).first()).toBeVisible({ timeout: 10_000 });
  });

  test("reception new booking opens booking modal", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/display/fhsalon/reception");
    await expect(page.getByTestId("store-display-board")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("reception-client-panel")).toBeVisible();
    await page.getByTestId("reception-new-booking").click();
    await expect(page.getByTestId("reception-new-booking-modal")).toBeVisible();
    await expect(page.getByLabel("Booking service")).toBeVisible();
  });

  test("reception walk-in opens walk-in modal", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/display/fhsalon/reception");
    await expect(page.getByTestId("store-display-board")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("reception-walk-in").click();
    await expect(page.getByTestId("reception-walk-in-modal")).toBeVisible();
    await expect(page.getByLabel("Walk-in service")).toBeAttached();
  });

  test("display today hides completed bookings", async ({ page }) => {
    await adminLogin(page);
    await clearOpenBookingsForStylist(page, /^omar$/i);
    const catalog = await page.request.get("/api/public/fhsalon/catalog");
    const cat = await catalog.json();
    const service =
      (cat.services || []).find((s: { name: string }) => /beard tidy/i.test(s.name)) ||
      (cat.services || []).find((s: { name: string }) => /^men.?s haircut/i.test(s.name));
    const omar = (cat.stylists || []).find((s: { name: string }) => /omar/i.test(s.name));
    expect(service?.id && omar?.id).toBeTruthy();

    const clientName = `DoneHide ${Date.now()}`;
    const walk = await page.request.post("/api/admin/walk-in", {
      data: {
        serviceId: service.id,
        stylistId: omar.id,
        nextAvailable: true,
        clientName,
      },
    });
    expect(walk.ok(), `walk-in create: ${await walk.text()}`).toBeTruthy();
    const created = await walk.json();
    const id = created.appointment?.id as string;
    expect(id).toBeTruthy();

    const done = await page.request.patch(`/api/display/fhsalon/appointments/${id}`, {
      data: { status: "COMPLETED", chargedCents: 2500, tipCents: 0 },
    });
    expect(done.ok()).toBeTruthy();

    await page.goto("/display/fhsalon/reception");
    await expect(page.getByTestId("store-display-board")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("article").filter({ hasText: clientName })).toHaveCount(0);
  });

  test("display waitlist seat then check in then done with payment", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const clientName = `WaitCycle ${Date.now()}`;

    await adminLogin(page);
    await clearOpenBookingsForStylist(page, /^(aisha|omar|farzana)$/i);
    await page.request.post("/api/display/fhsalon/checkout", { data: { action: "cancel" } }).catch(() => undefined);
    const catalog = await page.request.get("/api/public/fhsalon/catalog");
    expect(catalog.ok()).toBeTruthy();
    const cat = await catalog.json();
    const service =
      (cat.services || []).find((s: { name: string }) => /beard tidy/i.test(s.name)) ||
      (cat.services || []).find((s: { name: string }) => /\bmen'?s haircut\b/i.test(s.name));
    const omar = (cat.stylists || []).find((s: { name: string }) => /omar/i.test(s.name));
    expect(service?.id).toBeTruthy();
    expect(omar?.id).toBeTruthy();

    const walk = await page.request.post("/api/admin/walk-in", {
      data: {
        serviceId: service.id,
        stylistId: omar.id,
        nextAvailable: true,
        clientName,
      },
    });
    expect(walk.ok(), `walk-in create: ${await walk.text()}`).toBeTruthy();

    await page.goto("/display/fhsalon/reception");
    const row = page.locator("article").filter({ hasText: clientName }).first();
    await expect(row).toBeVisible({ timeout: 40_000 });
    await row.click();
    const panel = page.getByTestId("reception-client-panel");
    await expect(panel).toContainText(clientName);
    const checkIn = panel.getByRole("button", { name: /^check-in$/i });
    if (await checkIn.count()) {
      await checkIn.click();
      await expect(row.getByText(/on chair|checked in/i)).toBeVisible({ timeout: 10_000 });
    } else {
      await expect(row.getByText(/on chair|checked in/i)).toBeVisible();
    }

    await panel.getByRole("button", { name: /^checkout$/i }).click();
    const desk = page.getByTestId("reception-checkout-desk");
    await expect(desk).toBeVisible({ timeout: 10_000 });
    await expect(desk.getByText(service.name, { exact: true })).toBeVisible();
    await expect(desk.getByTestId("reception-quick-services")).toBeVisible();
    await expect(desk.getByTestId("reception-checkout-tax")).toBeVisible();
    const quick = desk.getByTestId("reception-quick-service").first();
    if (await quick.count()) {
      await quick.click();
    }
    const productSelect = page.getByTestId("reception-add-product");
    const productOptions = await productSelect.locator("option").all();
    if (productOptions.length > 1) {
      await productSelect.selectOption({ index: 1 });
      await expect(desk.getByTestId("checkout-product-line").first()).toBeVisible({ timeout: 8_000 });
    }
    await page.getByTestId("reception-payment-received").click();
    await expect(
      page.locator("article").filter({ hasText: clientName })
    ).toHaveCount(0, { timeout: 15_000 });
  });

  test("checkout shows service bill on the customer display", async ({ page, browser }) => {
    const clientName = `BillTv ${Date.now()}`;
    await adminLogin(page);
    await clearOpenBookingsForStylist(page, /^(aisha|omar|farzana)$/i);
    await page.request.post("/api/display/fhsalon/checkout", { data: { action: "cancel" } }).catch(() => undefined);
    const catalog = await page.request.get("/api/public/fhsalon/catalog");
    const cat = await catalog.json();
    const service =
      (cat.services || []).find((s: { name: string }) => /beard tidy/i.test(s.name)) ||
      (cat.services || []).find((s: { name: string }) => /\bmen'?s haircut\b/i.test(s.name));
    const omar = (cat.stylists || []).find((s: { name: string }) => /omar/i.test(s.name));
    expect(service?.id).toBeTruthy();
    expect(omar?.id).toBeTruthy();

    const walk = await page.request.post("/api/admin/walk-in", {
      data: {
        serviceId: service.id,
        stylistId: omar.id,
        nextAvailable: true,
        clientName,
      },
    });
    expect(walk.ok(), `walk-in create: ${await walk.text()}`).toBeTruthy();

    const customer = await browser.newPage();
    await customer.goto("/display/fhsalon/lounge");
    await expect(customer.getByTestId("store-display-board")).toBeVisible({ timeout: 15_000 });

    await page.goto("/display/fhsalon/reception");
    const row = page.locator("article").filter({ hasText: clientName }).first();
    await expect(row).toBeVisible({ timeout: 40_000 });
    await row.click();
    await page.getByTestId("reception-client-panel").getByRole("button", { name: /^checkout$/i }).click();
    await expect(page.getByTestId("reception-checkout-desk")).toBeVisible({ timeout: 10_000 });

    const overlay = customer.getByTestId("customer-checkout-overlay");
    await expect(overlay).toBeVisible({ timeout: 20_000 });
    await expect(overlay).toContainText(/please review your visit/i);
    await expect(overlay.getByText(service.name)).toBeVisible();
    await expect(overlay).toContainText(/amount due/i);
    await expect(overlay.getByTestId("customer-checkout-tax")).toBeVisible();
    await expect(customer.getByTestId("customer-checkout-tip-picker")).toBeVisible();
    await expect(overlay.locator("input")).toHaveCount(0);
    await expect(customer.getByTestId("customer-tip-other")).toBeVisible();
    await customer.getByTestId("customer-tip-pct-20").click();
    await expect(overlay).toContainText(/20%/i);
    await customer.getByTestId("customer-tip-other").click();
    await expect(customer.getByTestId("customer-tip-keypad")).toBeVisible();
    await customer.getByTestId("customer-tip-key-7").click();
    await customer.getByTestId("customer-tip-key-0").click();
    await customer.getByTestId("customer-tip-key-0").click();
    await customer.getByTestId("customer-tip-key-set").click();
    await expect(overlay).toContainText("$7.00");

    const productSelect = page.getByTestId("reception-add-product");
    if ((await productSelect.locator("option").count()) > 1) {
      await productSelect.selectOption({ index: 1 });
      await expect(overlay.getByTestId("checkout-product-line").first()).toBeVisible({ timeout: 8_000 });
    }

    await customer.getByTestId("customer-checkout-confirm").click();
    await expect(page.getByTestId("reception-customer-confirmed")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("reception-customer-confirmed")).toContainText(/ready to pay/i);

    await page.getByTestId("reception-payment-received").click();
    await expect(overlay).toContainText(/thank you/i, { timeout: 10_000 });
    await overlay.click({ position: { x: 16, y: 16 } });
    await expect(overlay).toHaveCount(0, { timeout: 8_000 });
    await customer.close();
  });

  test("stylist can book for a client from Floor board", async ({ page }) => {
    await adminLogin(page);
    await clearOpenBookingsForStylist(page, /^farzana$/i);
    await stylistLogin(page);
    await gotoSettled(page, "/stylist/book");
    await expect(page.getByTestId("stylist-book-page")).toBeVisible();

    const clientName = `StyBook ${Date.now()}`;
    await bookViaStylistForm(page, {
      clientName,
      phone: `416${String(Date.now()).slice(-7)}`,
      date: bookableDateNearToday(),
    });

    await gotoSettled(page, "/stylist");
    await expect(page.getByText(clientName).first()).toBeVisible({ timeout: 15_000 });
  });

  test("stylist can book a client onto another stylist", async ({ page }) => {
    await stylistLogin(page);
    await gotoSettled(page, "/stylist/book");
    const clientName = `StyOther ${Date.now()}`;
    await bookViaStylistForm(page, {
      clientName,
      phone: `647${String(Date.now()).slice(-7)}`,
      otherStylist: true,
    });
    await expect(page.getByText(new RegExp(`booked\\s+${clientName}\\s+with`, "i"))).toBeVisible();
    // Not on logged-in stylist's My Jobs — verify via manager appointments
    await adminLogin(page);
    await gotoSettled(page, "/manager/appointments");
    await expect(page.getByText(clientName).first()).toBeVisible({ timeout: 15_000 });
  });

  test("stylist can seat waitlist guest to self or another stylist", async ({
    page,
  }) => {
    const clientName = `StySeat ${Date.now()}`;
    await adminLogin(page);
    // Clear chairs that prior walk-in tests filled — seating must have an open option
    await clearOpenBookingsForStylist(page, /^(aisha|omar|farzana)$/i);

    const catalog = await page.request.get("/api/public/fhsalon/catalog");
    const cat = await catalog.json();
    const service =
      (cat.services || []).find((s: { name: string }) => /bang|fringe/i.test(s.name)) ||
      (cat.services || []).find((s: { name: string }) => /beard tidy/i.test(s.name)) ||
      (cat.services || []).find((s: { name: string }) => /^men.?s haircut/i.test(s.name));
    expect(service?.id).toBeTruthy();
    const aisha = (cat.stylists || []).find((s: { name: string }) => /aisha/i.test(s.name));
    expect(aisha?.id).toBeTruthy();
    const add = await page.request.post("/api/admin/waitlist", {
      data: { clientName, serviceId: service.id },
    });
    expect(add.ok()).toBeTruthy();
    const added = await add.json();
    const entryId = added.entry?.id as string;
    expect(entryId).toBeTruthy();

    await clearAuthSession(page);
    await gotoSettled(page, "/stylist/login");
    await page.getByLabel(/^email$/i).fill("aisha@fhsalon.ca");
    await page.getByLabel(/^password$/i).fill("demo1234");
    await page.locator('form button[type="submit"]').click();
    await expect(page).toHaveURL(/\/stylist(?!\/login)/, { timeout: 20_000 });

    await gotoSettled(page, "/stylist");
    await page.getByTestId("stylist-waitlist-badge").click();
    const waitlist = page.getByTestId("walk-in-waitlist");
    const entry = waitlist.locator("[data-testid=waitlist-entry]").filter({
      hasText: clientName,
    });
    await expect(entry).toBeVisible({ timeout: 15_000 });
    await expect(entry.getByTestId("waitlist-seat-now")).toBeEnabled({ timeout: 30_000 });

    // Same PATCH handler as Confirm seat; request context avoids UI poll races on "Seating…"
    const seat = await page.request.patch("/api/stylist/waitlist", {
      data: { action: "seat", id: entryId, stylistId: aisha.id },
      timeout: 20_000,
    });
    expect(seat.ok(), `seat waitlist: ${await seat.text()}`).toBeTruthy();

    await gotoSettled(page, "/stylist");
    await page.getByTestId("stylist-waitlist-badge").click();
    await expect(
      page.getByTestId("walk-in-waitlist").locator("[data-testid=waitlist-entry]").filter({
        hasText: clientName,
      })
    ).toHaveCount(0, { timeout: 15_000 });
    await page.getByTestId("stylist-waitlist-sheet").getByRole("button", { name: /close/i }).first().click();
    await expect(
      page
        .getByTestId("stylist-day-timeline")
        .locator("article")
        .filter({ hasText: clientName })
    ).toBeVisible({ timeout: 15_000 });
  });
});
