import { NextResponse } from "next/server";
import { canManageStylist } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DAYS = [0, 1, 2, 3, 4, 5, 6];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await canManageStylist(id);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stylist = await prisma.stylist.findUnique({ where: { id } });
  if (!stylist) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [weekHours, blocks, salon] = await Promise.all([
    prisma.stylistWeekHour.findMany({
      where: { stylistId: id },
      orderBy: { dayOfWeek: "asc" },
    }),
    prisma.stylistBlock.findMany({
      where: { stylistId: id, endsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.salon.findUniqueOrThrow({ where: { id: session.salonId } }),
  ]);

  const hours = DAYS.map((dayOfWeek) => {
    const existing = weekHours.find((h) => h.dayOfWeek === dayOfWeek);
    if (existing) return existing;
    return {
      id: null,
      stylistId: id,
      dayOfWeek,
      startHour: salon.openHour,
      startMinute: 0,
      endHour: salon.closeHour,
      endMinute: 0,
      isOff: dayOfWeek === 0,
    };
  });

  return NextResponse.json({ stylist, weekHours: hours, blocks });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await canManageStylist(id);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const weekHours = Array.isArray(body.weekHours) ? body.weekHours : [];

  for (const row of weekHours) {
    const dayOfWeek = Number(row.dayOfWeek);
    if (!DAYS.includes(dayOfWeek)) continue;
    await prisma.stylistWeekHour.upsert({
      where: { stylistId_dayOfWeek: { stylistId: id, dayOfWeek } },
      update: {
        startHour: Number(row.startHour),
        startMinute: Number(row.startMinute || 0),
        endHour: Number(row.endHour),
        endMinute: Number(row.endMinute || 0),
        isOff: Boolean(row.isOff),
      },
      create: {
        stylistId: id,
        dayOfWeek,
        startHour: Number(row.startHour),
        startMinute: Number(row.startMinute || 0),
        endHour: Number(row.endHour),
        endMinute: Number(row.endMinute || 0),
        isOff: Boolean(row.isOff),
      },
    });
  }

  return NextResponse.json({ ok: true });
}
