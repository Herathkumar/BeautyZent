import { NextResponse } from "next/server";
import {
  CLIENT_CANCEL_HOURS,
  canCancelOnline,
  getConsumerSession,
  normalizeEmail,
} from "@/lib/client-auth";
import { syncAppointmentToGoogle } from "@/lib/calendar";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const account = await getConsumerSession();
  if (!account) {
    return NextResponse.json({ error: "Sign in to manage this booking." }, { status: 401 });
  }

  const { id } = await params;
  const appointment = await prisma.appointment.findFirst({
    where: {
      id,
      client: {
        memberAt: { not: null },
        OR: [
          { accountId: account.id },
          { email: { equals: normalizeEmail(account.email), mode: "insensitive" } },
        ],
      },
    },
  });
  if (!appointment) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  if (appointment.status !== "BOOKED") {
    return NextResponse.json({ error: "This booking can’t be cancelled." }, { status: 400 });
  }
  if (!canCancelOnline(appointment.startsAt)) {
    return NextResponse.json(
      {
        error: `Online changes are available until ${CLIENT_CANCEL_HOURS} hours before your visit.`,
      },
      { status: 400 }
    );
  }

  const siblings = appointment.bookingGroupId
    ? await prisma.appointment.findMany({
        where: {
          salonId: appointment.salonId,
          clientId: appointment.clientId,
          bookingGroupId: appointment.bookingGroupId,
        },
        select: { id: true, status: true },
      })
    : [{ id: appointment.id, status: appointment.status }];
  if (siblings.some((item) => item.status !== "BOOKED")) {
    return NextResponse.json(
      { error: "This booking can no longer be cancelled online." },
      { status: 400 }
    );
  }

  await prisma.appointment.updateMany({
    where: { id: { in: siblings.map((item) => item.id) } },
    data: { status: "CANCELLED" },
  });
  await Promise.all(
    siblings.map((item) => syncAppointmentToGoogle(item.id).catch(() => null))
  );

  return NextResponse.json({ ok: true, message: "Booking cancelled." });
}
