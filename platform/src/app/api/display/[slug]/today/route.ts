import { NextResponse } from "next/server";
import { assertDisplayAccess } from "@/lib/display-pin";
import { prisma } from "@/lib/prisma";
import {
  addCalendarDays,
  calendarDateInTz,
  dayOfWeekInTz,
  zonedStartOfDay,
} from "@/lib/salon-time";
import { stylistPhotoUrl } from "@/lib/stylist-photo";

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
      openHour: true,
      closeHour: true,
      closedDays: true,
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

  const [appointments, stylists] = await Promise.all([
    prisma.appointment.findMany({
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
        clientId: true,
        chargedCents: true,
        tipCents: true,
        client: {
          select: { id: true, name: true, phone: true, email: true, notes: true, createdAt: true },
        },
        service: { select: { id: true, name: true, priceCents: true, category: true, durationMin: true } },
        stylist: {
          select: {
            id: true,
            name: true,
            color: true,
            bio: true,
            gender: true,
            photoMime: true,
            photoUpdatedAt: true,
          },
        },
      },
      orderBy: { startsAt: "asc" },
    }),
    prisma.stylist.findMany({
      where: { salonId: salon.id, active: true, removedAt: null },
      select: {
        id: true,
        name: true,
        bio: true,
        color: true,
        gender: true,
        photoMime: true,
        photoUpdatedAt: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const clientIds = [...new Set(appointments.map((a) => a.clientId))];
  // Bound history so reception/TV polls do not scan a client's entire lifetime.
  const historyFrom = new Date(from.getTime() - 548 * 24 * 60 * 60 * 1000);
  const visitRows = clientIds.length
    ? await prisma.appointment.groupBy({
        by: ["clientId"],
        where: {
          salonId: salon.id,
          clientId: { in: clientIds },
          status: "COMPLETED",
          startsAt: { gte: historyFrom },
        },
        _count: { _all: true },
      })
    : [];
  const visits = new Map(visitRows.map((row) => [row.clientId, row._count._all]));

  const recentRows = clientIds.length
    ? await prisma.appointment.findMany({
        where: {
          salonId: salon.id,
          clientId: { in: clientIds },
          status: "COMPLETED",
          startsAt: { gte: historyFrom },
        },
        select: {
          clientId: true,
          startsAt: true,
          service: { select: { name: true } },
        },
        orderBy: { startsAt: "desc" },
        take: Math.min(Math.max(clientIds.length * 3, 9), 90),
      })
    : [];
  const recentByClient = new Map<string, { serviceName: string; date: string }[]>();
  for (const row of recentRows) {
    const list = recentByClient.get(row.clientId) || [];
    if (list.length >= 3) continue;
    list.push({
      serviceName: row.service.name,
      date: row.startsAt.toISOString(),
    });
    recentByClient.set(row.clientId, list);
  }

  return NextResponse.json({
    salon: {
      name: salon.name,
      slug: salon.slug,
      phone: salon.phone,
      address: salon.address,
      timezone: timeZone,
      today: todayYmd,
      openHour: salon.openHour,
      closeHour: salon.closeHour,
      closedDays: salon.closedDays || [],
      todayClosed: (salon.closedDays || []).includes(dayOfWeekInTz(todayYmd, timeZone)),
    },
    range: {
      from: from.toISOString(),
      to: toExclusive.toISOString(),
      days,
      today: todayYmd,
      timezone: timeZone,
    },
    stylists: stylists.map((s) => ({
      id: s.id,
      name: s.name,
      bio: s.bio,
      color: s.color,
      photoUrl: stylistPhotoUrl({
        id: s.id,
        gender: s.gender,
        photoUpdatedAt: s.photoUpdatedAt,
        hasPhoto: Boolean(s.photoMime && s.photoUpdatedAt),
      }),
    })),
    appointments: appointments.map((a) => ({
      id: a.id,
      startsAt: a.startsAt,
      endsAt: a.endsAt,
      status: a.status,
      source: a.source,
      notes: a.notes,
      chargedCents: a.chargedCents,
      tipCents: a.tipCents,
      client: {
        id: a.client.id,
        name: a.client.name,
        phone: a.client.phone,
        email: a.client.email,
        notes: a.client.notes,
        createdAt: a.client.createdAt,
        visitCount: visits.get(a.clientId) || 0,
        recentVisits: recentByClient.get(a.clientId) || [],
      },
      service: a.service,
      stylist: {
        id: a.stylist.id,
        name: a.stylist.name,
        color: a.stylist.color,
        bio: a.stylist.bio,
        photoUrl: stylistPhotoUrl({
          id: a.stylist.id,
          gender: a.stylist.gender,
          photoUpdatedAt: a.stylist.photoUpdatedAt,
          hasPhoto: Boolean(a.stylist.photoMime && a.stylist.photoUpdatedAt),
        }),
      },
    })),
  });
}
