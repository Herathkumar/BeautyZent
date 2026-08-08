import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  CLIENT_CANCEL_HOURS,
  canCancelOnline,
  getClientSessionForSalon,
} from "@/lib/client-auth";
import { syncAppointmentToGoogle } from "@/lib/calendar";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;
  const salon = await prisma.salon.findUnique({ where: { slug } });
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  const session = await getClientSessionForSalon(salon.id);
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const appt = await prisma.appointment.findFirst({
    where: { id, salonId: salon.id, clientId: session.clientId },
  });
  if (!appt) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  if (!["BOOKED", "CHECKED_IN"].includes(appt.status)) {
    return NextResponse.json({ error: "This booking can’t be cancelled." }, { status: 400 });
  }

  if (!canCancelOnline(appt.startsAt)) {
    return NextResponse.json(
      {
        error: `Online cancel is available until ${CLIENT_CANCEL_HOURS} hours before your visit. Please call the salon.`,
      },
      { status: 400 }
    );
  }

  const siblings = appt.bookingGroupId
    ? await prisma.appointment.findMany({
        where: {
          salonId: salon.id,
          clientId: session.clientId,
          bookingGroupId: appt.bookingGroupId,
          status: { in: ["BOOKED", "CHECKED_IN"] },
        },
      })
    : [appt];

  await prisma.appointment.updateMany({
    where: { id: { in: siblings.map((s) => s.id) } },
    data: { status: "CANCELLED" },
  });
  await Promise.all(siblings.map((s) => syncAppointmentToGoogle(s.id).catch(() => null)));

  return NextResponse.json({ ok: true });
}
