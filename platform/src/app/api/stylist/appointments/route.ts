import { NextResponse } from "next/server";
import { addDays, endOfDay, startOfDay } from "date-fns";
import { getStylistSession } from "@/lib/auth";
import { syncAppointmentToGoogle } from "@/lib/calendar";
import { updateAppointmentStatus } from "@/lib/complete-appointment";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getStylistSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const days = Math.min(60, Math.max(1, Number(url.searchParams.get("days") || 14)));
  const from = startOfDay(new Date());
  const to = endOfDay(addDays(from, days - 1));

  const appointments = await prisma.appointment.findMany({
    where: {
      stylistId: session.stylistId,
      startsAt: { gte: from, lte: to },
    },
    include: {
      client: true,
      service: true,
      stylePref: {
        select: { id: true, source: true, prompt: true },
      },
    },
    orderBy: { startsAt: "asc" },
  });

  return NextResponse.json({
    appointments: appointments.map((a) => ({
      ...a,
      stylePref: a.stylePref
        ? {
            id: a.stylePref.id,
            source: a.stylePref.source,
            prompt: a.stylePref.prompt,
            url: `/api/stylist/style-prefs/${a.id}`,
          }
        : null,
    })),
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
    where: { id: body.id, stylistId: session.stylistId },
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

  await syncAppointmentToGoogle(result.appointment.id);
  return NextResponse.json({ appointment: result.appointment });
}
