import { addMinutes } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  CLIENT_CANCEL_HOURS,
  canCancelOnline,
  getConsumerSession,
  normalizeEmail,
} from "@/lib/client-auth";
import { syncAppointmentToGoogle } from "@/lib/calendar";
import { prisma } from "@/lib/prisma";
import { calendarDateInTz } from "@/lib/salon-time";
import { getAvailableSlots } from "@/lib/slots";

const bodySchema = z.object({
  startsAt: z.string().min(1),
});

async function ownedBooking(accountId: string, email: string, id: string) {
  const head = await prisma.appointment.findFirst({
    where: {
      id,
      client: {
        memberAt: { not: null },
        OR: [
          { accountId },
          { email: { equals: normalizeEmail(email), mode: "insensitive" } },
        ],
      },
    },
    select: {
      id: true,
      salonId: true,
      clientId: true,
      stylistId: true,
      bookingGroupId: true,
      startsAt: true,
      status: true,
      salon: { select: { timezone: true } },
    },
  });
  if (!head) return null;

  const rows = await prisma.appointment.findMany({
    where: head.bookingGroupId
      ? {
          salonId: head.salonId,
          clientId: head.clientId,
          bookingGroupId: head.bookingGroupId,
        }
      : { id: head.id },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      status: true,
      serviceId: true,
      stylistId: true,
      service: { select: { durationMin: true } },
    },
  });
  return { head, rows };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const account = await getConsumerSession();
  if (!account) {
    return NextResponse.json({ error: "Sign in to manage this booking." }, { status: 401 });
  }
  const { id } = await params;
  const booking = await ownedBooking(account.id, account.email, id);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const date = new URL(req.url).searchParams.get("date") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Choose a valid date." }, { status: 400 });
  }
  if (
    booking.head.status !== "BOOKED" ||
    !canCancelOnline(booking.head.startsAt)
  ) {
    return NextResponse.json(
      {
        error: `Online changes are available until ${CLIENT_CANCEL_HOURS} hours before your visit.`,
      },
      { status: 400 }
    );
  }

  const slots = await getAvailableSlots({
    salonId: booking.head.salonId,
    stylistId: booking.head.stylistId,
    serviceIds: booking.rows.map((row) => row.serviceId),
    date,
    ignoreAppointmentIds: booking.rows.map((row) => row.id),
  });
  return NextResponse.json({
    slots,
    timezone: booking.head.salon.timezone,
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const account = await getConsumerSession();
  if (!account) {
    return NextResponse.json({ error: "Sign in to manage this booking." }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a valid appointment time." }, { status: 400 });
  }

  const { id } = await params;
  const booking = await ownedBooking(account.id, account.email, id);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  if (
    booking.head.status !== "BOOKED" ||
    booking.rows.some((row) => row.status !== "BOOKED") ||
    !canCancelOnline(booking.head.startsAt)
  ) {
    return NextResponse.json(
      {
        error: `Online changes are available until ${CLIENT_CANCEL_HOURS} hours before your visit.`,
      },
      { status: 400 }
    );
  }

  const startsAt = new Date(parsed.data.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "Choose a valid appointment time." }, { status: 400 });
  }
  const localDate = calendarDateInTz(booking.head.salon.timezone, startsAt);
  const slots = await getAvailableSlots({
    salonId: booking.head.salonId,
    stylistId: booking.head.stylistId,
    serviceIds: booking.rows.map((row) => row.serviceId),
    date: localDate,
    ignoreAppointmentIds: booking.rows.map((row) => row.id),
  });
  if (!slots.some((slot) => new Date(slot).getTime() === startsAt.getTime())) {
    return NextResponse.json(
      { error: "That time is no longer available. Choose another slot." },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    let cursor = startsAt;
    for (const row of booking.rows) {
      const endsAt = addMinutes(cursor, row.service.durationMin);
      await tx.appointment.update({
        where: { id: row.id },
        data: { startsAt: cursor, endsAt },
      });
      cursor = endsAt;
    }
  });
  await Promise.all(
    booking.rows.map((row) => syncAppointmentToGoogle(row.id).catch(() => null))
  );

  return NextResponse.json({
    ok: true,
    startsAt,
    message: "Booking rescheduled.",
  });
}
