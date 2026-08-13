import { NextResponse } from "next/server";
import { getSession, isSalonStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateHours } from "@/lib/platform-salons";

const DAYS = new Set([0, 1, 2, 3, 4, 5, 6]);

const SALON_SELECT = {
  name: true,
  slug: true,
  address: true,
  brandColor: true,
  accentColor: true,
  bookingThemeId: true,
  managerThemeId: true,
  stylistThemeId: true,
  openHour: true,
  closeHour: true,
  closedDays: true,
  slotMinutes: true,
} as const;

/** Signed-in manager salon branding for chrome / splash / store hours. */
export async function GET() {
  const session = await getSession();
  if (!session || !isSalonStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const salon = await prisma.salon.findUnique({
    where: { id: session.salonId },
    select: SALON_SELECT,
  });
  if (!salon) {
    return NextResponse.json({ error: "Salon not found" }, { status: 404 });
  }

  return NextResponse.json(
    { salon },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/** Manager Payroll page saves regular store hours. */
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || !isSalonStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const current = await prisma.salon.findUnique({
    where: { id: session.salonId },
    select: { openHour: true, closeHour: true, closedDays: true, slotMinutes: true },
  });
  if (!current) {
    return NextResponse.json({ error: "Salon not found" }, { status: 404 });
  }

  const openHour = Math.round(Number(body.openHour ?? current.openHour));
  const closeHour = Math.round(Number(body.closeHour ?? current.closeHour));
  const hoursError = validateHours(openHour, closeHour, current.slotMinutes);
  if (hoursError) {
    return NextResponse.json({ error: hoursError }, { status: 400 });
  }

  const closedDaysRaw = Array.isArray(body.closedDays) ? body.closedDays : current.closedDays;
  const closedDays = [
    ...new Set(
      closedDaysRaw
        .map((d) => Math.round(Number(d)))
        .filter((d) => Number.isFinite(d) && DAYS.has(d))
    ),
  ].sort((a, b) => a - b);
  if (closedDays.length >= 7) {
    return NextResponse.json({ error: "Pick at least one open day." }, { status: 400 });
  }

  const salon = await prisma.salon.update({
    where: { id: session.salonId },
    data: { openHour, closeHour, closedDays },
    select: SALON_SELECT,
  });
  return NextResponse.json({ salon, message: "Store hours saved." });
}
