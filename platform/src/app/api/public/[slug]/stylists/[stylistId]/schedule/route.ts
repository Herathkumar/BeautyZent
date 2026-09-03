import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStylistDaySchedule } from "@/lib/stylist-schedule";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string; stylistId: string }> }
) {
  const { slug, stylistId } = await params;
  const url = new URL(req.url);
  const date = url.searchParams.get("date")?.trim() || undefined;

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }

  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { id: true, active: true },
  });
  if (!salon?.active) {
    return NextResponse.json({ error: "Salon not found" }, { status: 404 });
  }

  const schedule = await getStylistDaySchedule({
    salonId: salon.id,
    stylistId,
    date,
  });
  if (!schedule) {
    return NextResponse.json({ error: "Stylist not found" }, { status: 404 });
  }

  return NextResponse.json(schedule, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
