import { NextResponse } from "next/server";
import { addDays, endOfDay, startOfDay } from "date-fns";
import { assertDisplayAccess } from "@/lib/display-pin";
import { prisma } from "@/lib/prisma";

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
      displayPinHash: true,
    },
  });
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  const locked = await assertDisplayAccess(salon);
  if (locked) return locked;

  const url = new URL(req.url);
  const days = Math.min(60, Math.max(1, Number(url.searchParams.get("days") || 14)));
  const now = new Date();
  const from = startOfDay(now);
  const to = endOfDay(addDays(from, days - 1));

  const appointments = await prisma.appointment.findMany({
    where: {
      salonId: salon.id,
      startsAt: { gte: from, lte: to },
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
    },
    range: { from: from.toISOString(), to: to.toISOString(), days },
    appointments,
  });
}
