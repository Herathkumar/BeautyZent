import { NextResponse } from "next/server";
import { getSession, isSalonStaff } from "@/lib/auth";
import { createWalkInAppointment, findNextAvailableWalkIns } from "@/lib/walk-in";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !isSalonStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const serviceId = url.searchParams.get("serviceId") || "";
  const stylistId = url.searchParams.get("stylistId") || "";

  const [servicesRaw, stylists] = await Promise.all([
    prisma.service.findMany({
      where: { salonId: session.salonId, active: true },
      select: {
        id: true,
        name: true,
        durationMin: true,
        priceCents: true,
        stylists: { select: { stylistId: true } },
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.stylist.findMany({
      where: { salonId: session.salonId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const services = servicesRaw.map((s) => ({
    id: s.id,
    name: s.name,
    durationMin: s.durationMin,
    priceCents: s.priceCents,
    stylistIds: s.stylists.map((x) => x.stylistId),
  }));

  if (!serviceId) {
    return NextResponse.json({
      services,
      stylists,
      options: [],
      nextAvailable: null,
    });
  }

  const options = await findNextAvailableWalkIns({
    salonId: session.salonId,
    serviceId,
    stylistId: stylistId || null,
  });

  return NextResponse.json({
    services,
    stylists,
    options,
    nextAvailable: options[0] || null,
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !isSalonStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const serviceId = String(body.serviceId || "");
  let stylistId = String(body.stylistId || "");
  const clientName = String(body.clientName || "").trim() || "Walk-in";
  const clientPhone = body.clientPhone != null ? String(body.clientPhone) : "";
  const notes = body.notes != null ? String(body.notes) : "";
  const preferNext = body.nextAvailable !== false && !stylistId;

  if (!serviceId) {
    return NextResponse.json({ error: "serviceId required" }, { status: 400 });
  }

  let startsAt: Date | null = body.startsAt ? new Date(String(body.startsAt)) : null;
  if (startsAt && Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "Invalid startsAt" }, { status: 400 });
  }

  if (!stylistId || preferNext) {
    const options = await findNextAvailableWalkIns({
      salonId: session.salonId,
      serviceId,
      stylistId: stylistId || null,
    });
    if (!options[0]) {
      return NextResponse.json(
        { error: "No open walk-in slot today. Add guest to the waitlist instead." },
        { status: 409 }
      );
    }
    stylistId = options[0].stylistId;
    if (!startsAt) startsAt = new Date(options[0].startsAt);
  }

  const result = await createWalkInAppointment({
    salonId: session.salonId,
    stylistId,
    serviceId,
    clientName,
    clientPhone: clientPhone || null,
    notes: notes || null,
    startsAt,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    appointment: result.appointment,
    waitMinutes: result.waitMinutes,
  });
}
