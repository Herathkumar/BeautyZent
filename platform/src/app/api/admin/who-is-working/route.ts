import { NextResponse } from "next/server";
import { getSession, isSalonStaff } from "@/lib/auth";
import { getFloorRoster } from "@/lib/floor-roster";
import { calendarDateInTz } from "@/lib/salon-time";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !isSalonStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const salon = await prisma.salon.findUniqueOrThrow({
    where: { id: session.salonId },
  });
  const timeZone = salon.timezone || "America/Toronto";
  const today = calendarDateInTz(timeZone);
  const url = new URL(req.url);
  const date = url.searchParams.get("date") || today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  try {
    const data = await getFloorRoster({ salonId: session.salonId, date });
    return NextResponse.json({
      date: data.date,
      today: data.today,
      weekdayLabel: data.weekdayLabel,
      timeZone: data.timeZone,
      counts: data.counts,
      roster: data.roster,
    });
  } catch {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
}
