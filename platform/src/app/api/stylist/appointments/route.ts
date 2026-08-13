import { NextResponse } from "next/server";
import { getStylistSession } from "@/lib/auth";
import { syncAppointmentToGoogle } from "@/lib/calendar";
import { updateAppointmentStatus } from "@/lib/complete-appointment";
import { prisma } from "@/lib/prisma";
import {
  addCalendarDays,
  calendarDateInTz,
  zonedStartOfDay,
} from "@/lib/salon-time";

export async function GET(req: Request) {
  const session = await getStylistSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const salon = await prisma.salon.findUnique({
    where: { id: session.salonId },
    select: { timezone: true },
  });
  const timeZone = salon?.timezone || "America/Toronto";

  const url = new URL(req.url);
  const days = Math.min(60, Math.max(1, Number(url.searchParams.get("days") || 14)));
  const todayYmd = calendarDateInTz(timeZone);
  const from = new Date(zonedStartOfDay(todayYmd, timeZone).getTime());
  const to = new Date(
    zonedStartOfDay(addCalendarDays(todayYmd, days, timeZone), timeZone).getTime()
  );

  // Never include client/service with `true` — those models have Bytes image columns
  // that make this payload huge and My Jobs feel stuck on "Loading your day…".
  const appointments = await prisma.appointment.findMany({
    where: {
      salonId: session.salonId,
      stylistId: session.stylistId,
      startsAt: { gte: from, lt: to },
    },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      status: true,
      source: true,
      notes: true,
      chargedCents: true,
      tipCents: true,
      bookingGroupId: true,
      client: { select: { name: true, phone: true } },
      service: {
        select: { name: true, priceCents: true, durationMin: true },
      },
      stylePref: {
        select: { id: true, source: true, prompt: true },
      },
    },
    orderBy: { startsAt: "asc" },
  });

  // Preferred look is stored on the group head; attach it to every sibling row.
  const groupIds = [
    ...new Set(
      appointments
        .filter((a) => a.bookingGroupId && !a.stylePref)
        .map((a) => a.bookingGroupId!)
    ),
  ];
  const groupPref = new Map<
    string,
    { id: string; source: string; prompt: string | null }
  >();
  if (groupIds.length > 0) {
    const heads = await prisma.appointment.findMany({
      where: {
        stylistId: session.stylistId,
        bookingGroupId: { in: groupIds },
      },
      orderBy: { startsAt: "asc" },
      select: {
        bookingGroupId: true,
        stylePref: { select: { id: true, source: true, prompt: true } },
      },
    });
    for (const h of heads) {
      if (!h.bookingGroupId || !h.stylePref || groupPref.has(h.bookingGroupId)) continue;
      groupPref.set(h.bookingGroupId, h.stylePref);
    }
  }

  return NextResponse.json({
    appointments: appointments.map((a) => {
      const pref =
        a.stylePref ||
        (a.bookingGroupId ? groupPref.get(a.bookingGroupId) : null) ||
        null;
      return {
        ...a,
        stylePref: pref
          ? {
              id: pref.id,
              source: pref.source,
              prompt: pref.prompt,
              url: `/api/stylist/style-prefs/${a.id}`,
            }
          : null,
      };
    }),
  });
}

export async function PATCH(req: Request) {
  const session = await getStylistSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const allowed = ["BOOKED", "CHECKED_IN", "COMPLETED", "CANCELLED", "NO_SHOW"];
  if (!allowed.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const appt = await prisma.appointment.findFirst({
    where: { id: body.id, stylistId: session.stylistId, salonId: session.salonId },
    select: { id: true },
  });
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await updateAppointmentStatus({
    appointmentId: appt.id,
    status: body.status,
    chargedCents: body.chargedCents,
    tipCents: body.tipCents,
    chargedByUserId: session.userId,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  void syncAppointmentToGoogle(result.appointment.id).catch(() => null);
  return NextResponse.json({ appointment: result.appointment });
}
