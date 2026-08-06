import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ANY_STYLIST_ID } from "@/lib/client-auth";
import { getAvailableSlots } from "@/lib/slots";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const url = new URL(req.url);
  const stylistId = url.searchParams.get("stylistId");
  const serviceId = url.searchParams.get("serviceId");
  const date = url.searchParams.get("date");
  if (!stylistId || !serviceId || !date) {
    return NextResponse.json(
      { error: "stylistId, serviceId, date required" },
      { status: 400 }
    );
  }

  const salon = await prisma.salon.findUnique({ where: { slug } });
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }

  if (stylistId === ANY_STYLIST_ID) {
    const links = await prisma.stylistService.findMany({
      where: {
        serviceId,
        stylist: { salonId: salon.id, active: true },
      },
      select: { stylistId: true },
    });
    const byStart = new Map<string, string>();
    for (const link of links) {
      const slots = await getAvailableSlots({
        salonId: salon.id,
        stylistId: link.stylistId,
        serviceId,
        date,
      });
      for (const start of slots) {
        if (!byStart.has(start)) byStart.set(start, link.stylistId);
      }
    }
    const entries = [...byStart.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return NextResponse.json({
      slots: entries.map(([startsAt]) => startsAt),
      slotStylists: Object.fromEntries(entries),
      timezone: salon.timezone,
      anyStylist: true,
    });
  }

  const slots = await getAvailableSlots({
    salonId: salon.id,
    stylistId,
    serviceId,
    date,
  });

  return NextResponse.json({ slots, timezone: salon.timezone, anyStylist: false });
}
