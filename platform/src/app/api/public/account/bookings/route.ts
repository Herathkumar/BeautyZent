import { NextResponse } from "next/server";
import {
  CLIENT_CANCEL_HOURS,
  canCancelOnline,
  getConsumerSession,
  normalizeEmail,
} from "@/lib/client-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const account = await getConsumerSession();
  if (!account) {
    return NextResponse.json({ error: "Sign in to view your bookings." }, { status: 401 });
  }

  const rows = await prisma.appointment.findMany({
    where: {
      client: {
        memberAt: { not: null },
        OR: [
          { accountId: account.id },
          { email: { equals: normalizeEmail(account.email), mode: "insensitive" } },
        ],
      },
      salon: { active: true },
    },
    orderBy: { startsAt: "desc" },
    take: 240,
    select: {
      id: true,
      bookingGroupId: true,
      startsAt: true,
      endsAt: true,
      status: true,
      notes: true,
      salonId: true,
      stylistId: true,
      serviceId: true,
      salon: {
        select: {
          name: true,
          slug: true,
          timezone: true,
          phone: true,
          city: true,
          region: true,
        },
      },
      service: {
        select: { id: true, name: true, durationMin: true, priceCents: true },
      },
      stylist: { select: { id: true, name: true } },
    },
  });

  type Row = (typeof rows)[number];
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = `${row.salonId}:${row.bookingGroupId || row.id}`;
    const group = groups.get(key) || [];
    group.push(row);
    groups.set(key, group);
  }

  const now = new Date();
  const bookings = [...groups.values()]
    .map((group) => {
      group.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
      const head = group[0]!;
      const tail = group[group.length - 1]!;
      const status = group.some((item) => item.status === "BOOKED")
        ? "BOOKED"
        : group.some((item) => item.status === "CHECKED_IN")
          ? "CHECKED_IN"
          : head.status;
      const changeAllowed =
        group.every((item) => item.status === "BOOKED") &&
        canCancelOnline(head.startsAt, now);

      return {
        id: head.id,
        bookingGroupId: head.bookingGroupId,
        startsAt: head.startsAt,
        endsAt: tail.endsAt,
        status,
        notes: head.notes,
        canCancel: changeAllowed,
        canReschedule: changeAllowed,
        salon: head.salon,
        stylist: head.stylist,
        serviceIds: group.map((item) => item.serviceId),
        services: group.map((item) => item.service),
        totalDurationMin: group.reduce(
          (sum, item) => sum + item.service.durationMin,
          0
        ),
        totalPriceCents: group.reduce(
          (sum, item) => sum + item.service.priceCents,
          0
        ),
      };
    })
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());

  return NextResponse.json({
    bookings,
    cancelPolicyHours: CLIENT_CANCEL_HOURS,
  });
}
