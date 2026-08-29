import { NextResponse } from "next/server";
import {
  normalizeCustomerDisplayView,
  normalizeCustomerDisplayViewControl,
  normalizeCustomerDisplayViewRotateSec,
} from "@/lib/customer-display-view";
import {
  clearDisplayUnlockCookieOn,
  createDisplayUnlockToken,
  normalizeDisplayPin,
  sessionBypassesDisplayPin,
  verifyDisplayPin,
} from "@/lib/display-pin";
import { prisma } from "@/lib/prisma";
import { calendarDateInTz, dayOfWeekInTz } from "@/lib/salon-time";

const salonHoursCoreSelect = {
  id: true,
  slug: true,
  name: true,
  timezone: true,
  openHour: true,
  closeHour: true,
  closedDays: true,
  displayPinHash: true,
  displayPinSetAt: true,
  displayViewMode: true,
} as const;

const salonHoursSelect = {
  ...salonHoursCoreSelect,
  displayViewControl: true,
  displayViewRotateSec: true,
} as const;

async function loadSalonHours(slug: string) {
  try {
    return await prisma.salon.findUnique({
      where: { slug },
      select: salonHoursSelect,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err || "");
    if (!/displayView(Control|RotateSec)/i.test(message)) throw err;
    const salon = await prisma.salon.findUnique({
      where: { slug },
      select: salonHoursCoreSelect,
    });
    return salon
      ? { ...salon, displayViewControl: "manual", displayViewRotateSec: 60 }
      : null;
  }
}

function publicSalon(salon: {
  name: string;
  slug: string;
  timezone?: string | null;
  openHour: number;
  closeHour: number;
  closedDays: number[];
  displayViewMode?: string | null;
  displayViewControl?: string | null;
  displayViewRotateSec?: number | null;
}) {
  const timeZone = salon.timezone || "America/Toronto";
  const today = calendarDateInTz(timeZone);
  return {
    name: salon.name,
    slug: salon.slug,
    timezone: timeZone,
    openHour: salon.openHour,
    closeHour: salon.closeHour,
    closedDays: salon.closedDays || [],
    todayClosed: (salon.closedDays || []).includes(dayOfWeekInTz(today, timeZone)),
    displayViewMode: normalizeCustomerDisplayView(salon.displayViewMode),
    displayViewControl: normalizeCustomerDisplayViewControl(salon.displayViewControl),
    displayViewRotateSec: normalizeCustomerDisplayViewRotateSec(salon.displayViewRotateSec),
  };
}

/**
 * Check whether this tablet needs PIN unlock.
 *
 * Public tablet URL: always needs PIN when set (no cookie unlock).
 * Embedded manager/stylist apps (`?mode=embedded`): signed-in staff skip PIN.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await loadSalonHours(slug);
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  const pinSet = Boolean(salon.displayPinHash);
  if (!pinSet) {
    return NextResponse.json({
      pinSet: false,
      needsPin: false,
      unlocked: true,
      salon: publicSalon(salon),
    });
  }

  const mode = new URL(req.url).searchParams.get("mode");
  const unlockedBySession =
    mode === "embedded" && (await sessionBypassesDisplayPin(salon.id));

  const res = NextResponse.json({
    pinSet: true,
    needsPin: !unlockedBySession,
    unlocked: unlockedBySession,
    salon: publicSalon(salon),
  });
  // Drop any legacy unlock cookies so refresh never auto-unlocks the tablet.
  if (mode !== "embedded") clearDisplayUnlockCookieOn(res);
  return res;
}

/** Unlock the salon display with the manager-set PIN (returns in-memory token). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await loadSalonHours(slug);
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  if (!salon.displayPinHash) {
    return NextResponse.json({
      ok: true,
      unlocked: true,
      needsPin: false,
      unlockToken: null,
      salon: publicSalon(salon),
    });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const pin = normalizeDisplayPin(body.pin);
  if (!pin) {
    return NextResponse.json({ error: "Enter the 4–6 digit PIN." }, { status: 400 });
  }

  const ok = await verifyDisplayPin(pin, salon.displayPinHash);
  if (!ok) {
    return NextResponse.json({ error: "Incorrect PIN." }, { status: 401 });
  }

  const unlockToken = await createDisplayUnlockToken({
    id: salon.id,
    slug: salon.slug,
    displayPinSetAt: salon.displayPinSetAt,
  });

  const res = NextResponse.json({
    ok: true,
    unlocked: true,
    needsPin: false,
    unlockToken,
    salon: publicSalon(salon),
    message: "Salon display unlocked.",
  });
  // Do not set a persistent cookie — refresh must ask for PIN again.
  clearDisplayUnlockCookieOn(res);
  return res;
}

/** Lock this browser/tablet again. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  const res = NextResponse.json({ ok: true, unlocked: false, needsPin: true });
  clearDisplayUnlockCookieOn(res);
  return res;
}
