import { test, expect } from "@playwright/test";
import { adminLogin, stylistLogin } from "./helpers";

test.describe("Walk-in appointments", () => {
  test("manager can seat a walk-in and filter by source", async ({ page }) => {
    const clientName = `WalkInMgr ${Date.now()}`;

    await adminLogin(page);
    await page.goto("/manager/walk-in");
    await expect(page.getByRole("heading", { name: /^walk-in$/i })).toBeVisible();
    await expect(page.getByTestId("walk-in-panel")).toBeVisible();

    await page.getByLabel("Walk-in service").selectOption({ index: 1 });
    await expect(
      page.getByTestId("walk-in-eta").or(page.getByText(/no open slot/i))
    ).toBeVisible({ timeout: 10_000 });
    await page.getByLabel("Walk-in client name").fill(clientName);
    await page.getByRole("button", { name: /seat walk-in/i }).click();

    await expect(page.getByText(/walk-in seated/i)).toBeVisible({ timeout: 15_000 });

    await page.goto("/manager/appointments");
    await expect(page.getByRole("heading", { name: /^bookings$/i })).toBeVisible();
    await page.getByLabel("Source").selectOption("WALK_IN");
    await expect(page.getByText(clientName).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("walk-in-badge").first()).toBeVisible();
  });

  test("manager opens store display from bookings and can seat waitlist", async ({
    page,
  }) => {
    await adminLogin(page);

    const catalog = await page.request.get("/api/public/fhsalon/catalog");
    const cat = await catalog.json();
    const service = (cat.services || []).find((s: { name: string }) =>
      /^men.?s haircut/i.test(s.name)
    );
    expect(service?.id).toBeTruthy();

    const clientName = `MgrDisplay ${Date.now()}`;
    const add = await page.request.post("/api/admin/waitlist", {
      data: { clientName, serviceId: service.id },
    });
    expect(add.ok()).toBeTruthy();

    await page.goto("/manager/appointments");
    await page.getByTestId("bookings-store-display").click();
    await expect(page).toHaveURL(/\/manager\/display/);
    await expect(page.getByTestId("manager-store-display")).toBeVisible();
    await expect(page.getByTestId("manager-store-display-board")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("display-waitlist-section")).toBeVisible();

    const waitlist = page.getByTestId("walk-in-waitlist");
    const entry = waitlist.locator("[data-testid=waitlist-entry]").filter({
      hasText: clientName,
    });
    await expect(entry).toBeVisible({ timeout: 15_000 });
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
    await page.goto("/manager/walk-in");
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

    await stylistLogin(page);
    await page.goto("/stylist");
    await page.getByTestId("stylist-walk-in-toggle").click();
    await expect(page.getByTestId("walk-in-panel")).toBeVisible();

    await page.getByLabel("Walk-in service").selectOption({ index: 1 });
    await page.getByLabel("Walk-in client name").fill(clientName);
    await page.getByRole("button", { name: /seat walk-in/i }).click();

    await expect(page.getByText(/walk-in seated/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(clientName).first()).toBeVisible({ timeout: 10_000 });
  });

  test("display board shows waitlist on Today only and walk-in form toggles", async ({
    page,
  }) => {
    await page.goto("/display/fhsalon");
    await expect(page.getByRole("button", { name: /^today/i })).toBeVisible();
    await expect(page.getByTestId("display-waitlist-section")).toBeVisible();
    await expect(page.getByTestId("walk-in-waitlist")).toBeVisible();
    await expect(
      page.getByText(/seat now → pick stylist → check in → done with payment/i)
    ).toBeVisible();

    const welcome = page.getByText(/welcome to the floor/i);
    const waitSection = page.getByTestId("display-waitlist-section");
    const welcomeBox = await welcome.boundingBox();
    const waitBox = await waitSection.boundingBox();
    expect(welcomeBox && waitBox).toBeTruthy();
    expect(waitBox!.y).toBeGreaterThan(welcomeBox!.y);

    await page.getByRole("button", { name: /^future/i }).click();
    await expect(page.getByTestId("walk-in-waitlist")).toHaveCount(0);

    await page.getByRole("button", { name: /^today/i }).click();
    await expect(page.getByTestId("walk-in-waitlist")).toBeVisible();
    await expect(page.getByRole("heading", { name: /walk-in desk/i })).toBeVisible();
    await page.getByTestId("display-walk-in-toggle").click();
    await expect(page.getByLabel("Walk-in service")).toBeVisible();
  });

  test("display today hides completed bookings", async ({ page }) => {
    await adminLogin(page);
    const catalog = await page.request.get("/api/public/fhsalon/catalog");
    const cat = await catalog.json();
    const service = (cat.services || []).find((s: { name: string }) =>
      /^men.?s haircut/i.test(s.name)
    );
    const omar = (cat.stylists || []).find((s: { name: string }) => /omar/i.test(s.name));
    expect(service?.id && omar?.id).toBeTruthy();

    const clientName = `DoneHide ${Date.now()}`;
    const walk = await page.request.post("/api/admin/walk-in", {
      data: {
        serviceId: service.id,
        stylistId: omar.id,
        nextAvailable: false,
        clientName,
      },
    });
    expect(walk.ok()).toBeTruthy();
    const created = await walk.json();
    const id = created.appointment?.id as string;
    expect(id).toBeTruthy();

    const done = await page.request.patch(`/api/display/fhsalon/appointments/${id}`, {
      data: { status: "COMPLETED", chargedCents: 2500, tipCents: 0 },
    });
    expect(done.ok()).toBeTruthy();

    await page.goto("/display/fhsalon");
    await expect(page.getByRole("button", { name: /^today/i })).toBeVisible();
    await expect(page.locator("article").filter({ hasText: clientName })).toHaveCount(0);
  });

  test("display waitlist seat then check in then done with payment", async ({
    page,
  }) => {
    const clientName = `WaitCycle ${Date.now()}`;

    await adminLogin(page);

    // Prefer men's cut + Omar so prior women's walk-ins don't block seating
    const catalog = await page.request.get("/api/public/fhsalon/catalog");
    expect(catalog.ok()).toBeTruthy();
    const cat = await catalog.json();
    const service = (cat.services || []).find((s: { name: string }) =>
      /^men.?s haircut/i.test(s.name)
    );
    const omar = (cat.stylists || []).find((s: { name: string }) => /omar/i.test(s.name));
    expect(service?.id).toBeTruthy();
    expect(omar?.id).toBeTruthy();

    const add = await page.request.post("/api/admin/waitlist", {
      data: {
        clientName,
        serviceId: service.id,
        stylistId: omar.id,
      },
    });
    expect(add.ok()).toBeTruthy();
    const added = await add.json();
    expect(added.entry?.id).toBeTruthy();

    await page.goto("/display/fhsalon");
    const waitlist = page.getByTestId("walk-in-waitlist");
    const entry = waitlist.locator("[data-testid=waitlist-entry]").filter({
      hasText: clientName,
    });
    await expect(entry).toBeVisible({ timeout: 15_000 });

    await entry.getByTestId("waitlist-seat-now").click();
    const picker = entry.getByTestId("waitlist-seat-picker");
    await expect(picker).toBeVisible();
    await expect(picker.getByRole("radio")).not.toHaveCount(0);
    // Switch / confirm a specific available stylist (Omar preferred)
    const omarRadio = picker.getByLabel(/seat with omar/i);
    if (await omarRadio.count()) {
      await omarRadio.check();
    } else {
      await picker.getByRole("radio").first().check();
    }
    await picker.getByTestId("waitlist-confirm-seat").click();

    await expect(entry).toHaveCount(0, { timeout: 10_000 });

    const row = page.locator("article").filter({ hasText: clientName }).first();
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.scrollIntoViewIfNeeded();
    await expect(row.getByRole("button", { name: /^check in$/i })).toBeVisible();
    await row.getByRole("button", { name: /^check in$/i }).click();
    await expect(row.getByText(/checked in/i)).toBeVisible({ timeout: 10_000 });

    page.on("dialog", async (d) => {
      const msg = d.message().toLowerCase();
      if (msg.includes("tip")) await d.accept("5.00");
      else if (msg.includes("charge") || msg.includes("$")) await d.accept("45.00");
      else await d.accept("0");
    });
    await row.getByRole("button", { name: /^done$/i }).click();
    // Completed jobs drop off today's floor list
    await expect(
      page.locator("article").filter({ hasText: clientName })
    ).toHaveCount(0, { timeout: 15_000 });
  });

  test("stylist can seat waitlist guest to self or another stylist", async ({
    page,
  }) => {
    const clientName = `StySeat ${Date.now()}`;
    await adminLogin(page);
    const catalog = await page.request.get("/api/public/fhsalon/catalog");
    const cat = await catalog.json();
    const service = (cat.services || []).find((s: { name: string }) =>
      /^men.?s haircut/i.test(s.name)
    );
    expect(service?.id).toBeTruthy();
    const add = await page.request.post("/api/admin/waitlist", {
      data: { clientName, serviceId: service.id },
    });
    expect(add.ok()).toBeTruthy();

    await stylistLogin(page);
    await page.goto("/stylist");
    const waitlist = page.getByTestId("walk-in-waitlist");
    const entry = waitlist.locator("[data-testid=waitlist-entry]").filter({
      hasText: clientName,
    });
    await expect(entry).toBeVisible({ timeout: 15_000 });
    await entry.getByTestId("waitlist-seat-now").click();
    const picker = entry.getByTestId("waitlist-seat-picker");
    await expect(picker).toBeVisible();
    // Prefer self when available, otherwise first open chair
    const selfLabel = picker.locator("label").filter({ hasText: /\(you\)/i });
    if (await selfLabel.count()) await selfLabel.locator('input[type="radio"]').check();
    else await picker.getByRole("radio").first().check();
    await picker.getByTestId("waitlist-confirm-seat").click();
    await expect(entry).toHaveCount(0, { timeout: 10_000 });
    await expect(page.getByText(clientName).first()).toBeVisible({ timeout: 10_000 });
  });
});
