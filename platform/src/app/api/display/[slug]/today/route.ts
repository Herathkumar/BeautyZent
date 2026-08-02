import { NextResponse } from "next/server";
import { endOfDay, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({ where: { slug } });
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  const now = new Date();
  const appointments = await prisma.appointment.findMany({
    where: {
      salonId: salon.id,
      startsAt: { gte: startOfDay(now), lte: endOfDay(now) },
      status: { not: "CANCELLED" },
    },
    include: {
      client: { select: { name: true, phone: true } },
      service: { select: { name: true } },
      stylist: { select: { name: true, color: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  return NextResponse.json({ salon: { name: salon.name, slug: salon.slug }, appointments });
}
