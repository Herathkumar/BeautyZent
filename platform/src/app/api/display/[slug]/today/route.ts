import { NextResponse } from "next/server";
import { assertDisplayAccess } from "@/lib/display-pin";
import { prisma } from "@/lib/prisma";
import {
  addCalendarDays,
  calendarDateInTz,
  zonedStartOfDay,
} from "@/lib/salon-time";

function toDate(d: { getTime: () => number }) {
  return new Date(d.getTime());
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      phone: true,
      address: true,
      timezone: true,
      displayPinHash: true,
      displayPinSetAt: true,
    },
  });
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  const locked = await assertDisplayAccess(salon, req);
  if (locked) return locked;

  const url = new URL(req.url);
  const days = Math.min(60, Math.max(1, Number(url.searchParams.get("days") || 14)));
  const timeZone = salon.timezone || "America/Toronto";
  const todayYmd = calendarDateInTz(timeZone);
  const from = toDate(zonedStartOfDay(todayYmd, timeZone));
  const toExclusive = toDate(
    zonedStartOfDay(addCalendarDays(todayYmd, days, timeZone), timeZone)
  );

  const appointments = await prisma.appointment.findMany({
    where: {
      salonId: salon.id,
      startsAt: { gte: from, lt: toExclusive },
      status: { not: "CANCELLED" },
    },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      status: true,
      source: true,
      notes: true,
      client: { select: { name: true, phone: true } },
      chargedCents: true,
      tipCents: true,
      service: { select: { name: true, priceCents: true } },
      stylist: { select: { name: true, color: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  return NextResponse.json({
    salon: {
      name: salon.name,
      slug: salon.slug,
      phone: salon.phone,
      address: salon.address,
      timezone: timeZone,
      today: todayYmd,
    },
    range: {
      from: from.toISOString(),
      to: toExclusive.toISOString(),
      days,
      today: todayYmd,
      timezone: timeZone,
    },
    appointments,
  });
}
