import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ANY_STYLIST_ID } from "@/lib/client-auth";
import { isE2eFixtureStylist } from "@/lib/display-schedule";
import { getAvailableSlots } from "@/lib/slots";

function parseServiceIds(url: URL) {
  const multi = url.searchParams.get("serviceIds");
  if (multi) {
    return [...new Set(multi.split(",").map((s) => s.trim()).filter(Boolean))];
  }
  const one = url.searchParams.get("serviceId");
  return one ? [one] : [];
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const url = new URL(req.url);
  const stylistId = url.searchParams.get("stylistId");
  const serviceIds = parseServiceIds(url);
  const date = url.searchParams.get("date");
  if (!stylistId || serviceIds.length === 0 || !date) {
    return NextResponse.json(
      { error: "stylistId, serviceId(s), date required" },
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
        serviceId: { in: serviceIds },
        stylist: { salonId: salon.id, active: true },
      },
      select: { stylistId: true, serviceId: true },
    });
    const byStylist = new Map<string, Set<string>>();
    for (const link of links) {
      const set = byStylist.get(link.stylistId) || new Set();
      set.add(link.serviceId);
      byStylist.set(link.stylistId, set);
    }
    const eligibleIds = [...byStylist.entries()]
      .filter(([, set]) => serviceIds.every((id) => set.has(id)))
      .map(([id]) => id);
    const real = await prisma.stylist.findMany({
      where: { salonId: salon.id, id: { in: eligibleIds } },
      select: { id: true, name: true, bio: true },
    });
    const eligible = real.filter((s) => !isE2eFixtureStylist(s)).map((s) => s.id);

    const byStart = new Map<string, string>();
    for (const sid of eligible) {
      const slots = await getAvailableSlots({
        salonId: salon.id,
        stylistId: sid,
        serviceIds,
        date,
      });
      for (const start of slots) {
        if (!byStart.has(start)) byStart.set(start, sid);
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
    serviceIds,
    date,
  });

  return NextResponse.json({ slots, timezone: salon.timezone, anyStylist: false });
}
