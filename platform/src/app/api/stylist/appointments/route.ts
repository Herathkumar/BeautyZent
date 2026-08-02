import { NextResponse } from "next/server";
import { addDays, endOfDay, startOfDay } from "date-fns";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncAppointmentToGoogle } from "@/lib/calendar";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "STYLIST" || !session.stylistId) {
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
    },
    orderBy: { startsAt: "asc" },
  });

  return NextResponse.json({ appointments });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "STYLIST" || !session.stylistId) {
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

  const updated = await prisma.appointment.update({
    where: { id: appt.id },
    data: { status: body.status },
  });
  await syncAppointmentToGoogle(updated.id);
  return NextResponse.json({ appointment: updated });
}
