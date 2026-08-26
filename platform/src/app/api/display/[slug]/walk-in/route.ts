import { NextResponse } from "next/server";
import { assertDisplayAccess } from "@/lib/display-pin";
import { prisma } from "@/lib/prisma";
import { createWalkInAppointment, findNextAvailableWalkIns } from "@/lib/walk-in";

/** Display walk-in catalog + seating. */
async function loadSalon(slug: string) {
  return prisma.salon.findUnique({
    where: { slug },
    select: { id: true, slug: true, displayPinHash: true, displayPinSetAt: true },
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await loadSalon(slug);
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  const locked = await assertDisplayAccess(salon, req);
  if (locked) return locked;

  const url = new URL(req.url);
  const serviceId = url.searchParams.get("serviceId") || "";

  const [catalog, options] = await Promise.all([
    prisma.service.findMany({
      where: { salonId: salon.id, active: true },
      select: {
        id: true,
        name: true,
        durationMin: true,
        priceCents: true,
        stylists: { select: { stylistId: true } },
      },
      orderBy: { sortOrder: "asc" },
    }),
    serviceId
      ? findNextAvailableWalkIns({ salonId: salon.id, serviceId })
      : Promise.resolve([]),
  ]);

  const stylists = await prisma.stylist.findMany({
    where: { salonId: salon.id, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    services: catalog.map((s) => ({
      id: s.id,
      name: s.name,
      durationMin: s.durationMin,
      priceCents: s.priceCents,
      stylistIds: s.stylists.map((x) => x.stylistId),
    })),
    stylists,
    options,
    nextAvailable: options[0] || null,
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await loadSalon(slug);
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  const locked = await assertDisplayAccess(salon, req);
  if (locked) return locked;

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

  if (!serviceId) {
    return NextResponse.json({ error: "serviceId required" }, { status: 400 });
  }

  if (!stylistId) {
    const options = await findNextAvailableWalkIns({
      salonId: salon.id,
      serviceId,
    });
    if (!options[0]) {
      return NextResponse.json(
        { error: "No open walk-in slot. Add to waitlist instead." },
        { status: 409 }
      );
    }
    stylistId = options[0].stylistId;
  }

  const result = await createWalkInAppointment({
    salonId: salon.id,
    stylistId,
    serviceId,
    clientName,
    clientPhone: clientPhone || null,
    notes: notes || null,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    appointment: result.appointment,
    waitMinutes: result.waitMinutes,
  });
}
