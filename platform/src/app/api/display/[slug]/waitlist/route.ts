import { NextResponse } from "next/server";
import { assertDisplayAccess } from "@/lib/display-pin";
import { prisma } from "@/lib/prisma";
import {
  findNextAvailableWalkIns,
  listWaitlistWithOptions,
  seatWaitlistGuest,
} from "@/lib/walk-in";

async function loadSalon(slug: string) {
  return prisma.salon.findUnique({
    where: { slug },
    select: { id: true, slug: true, displayPinHash: true, displayPinSetAt: true },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await loadSalon(slug);
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  const locked = await assertDisplayAccess(salon);
  if (locked) return locked;

  const waitlist = await listWaitlistWithOptions(salon.id);
  return NextResponse.json({ waitlist });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await loadSalon(slug);
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  const locked = await assertDisplayAccess(salon);
  if (locked) return locked;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "seat") {
    const id = String(body.id || "");
    const stylistId = body.stylistId ? String(body.stylistId) : null;
    const result = await seatWaitlistGuest({
      salonId: salon.id,
      entryId: id,
      stylistId,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result);
  }

  if (body.action === "cancel") {
    const id = String(body.id || "");
    const entry = await prisma.walkInWaitlist.findFirst({
      where: { id, salonId: salon.id },
    });
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const updated = await prisma.walkInWaitlist.update({
      where: { id: entry.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    return NextResponse.json({ entry: updated });
  }

  const clientName = String(body.clientName || "").trim() || "Walk-in guest";
  const clientPhone = body.clientPhone != null ? String(body.clientPhone).trim() : "";
  const serviceId = body.serviceId ? String(body.serviceId) : null;
  const stylistId = body.stylistId ? String(body.stylistId) : null;
  const note = body.note != null ? String(body.note) : null;

  let estimatedWaitMin: number | null = null;
  if (serviceId) {
    const options = await findNextAvailableWalkIns({
      salonId: salon.id,
      serviceId,
      stylistId,
    });
    estimatedWaitMin = options[0]?.waitMinutes ?? null;
  }

  const entry = await prisma.walkInWaitlist.create({
    data: {
      salonId: salon.id,
      clientName,
      clientPhone: clientPhone || null,
      serviceId,
      stylistId,
      note,
      status: "WAITING",
      estimatedWaitMin,
    },
    include: {
      service: { select: { id: true, name: true } },
      stylist: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ entry });
}
