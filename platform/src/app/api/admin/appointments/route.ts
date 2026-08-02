import { NextResponse } from "next/server";
import { addDays, endOfDay, startOfDay } from "date-fns";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const days = Number(url.searchParams.get("days") || 7);
  const from = startOfDay(new Date());
  const to = endOfDay(addDays(from, days));

  const appointments = await prisma.appointment.findMany({
    where: {
      salonId: session.salonId,
      startsAt: { gte: from, lte: to },
    },
    include: {
      client: true,
      service: true,
      stylist: true,
    },
    orderBy: { startsAt: "asc" },
  });
  return NextResponse.json({ appointments });
}
