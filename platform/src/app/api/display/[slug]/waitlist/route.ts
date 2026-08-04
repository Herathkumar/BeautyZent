import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createWalkInAppointment, findNextAvailableWalkIns } from "@/lib/walk-in";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({ where: { slug } });
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  const entries = await prisma.walkInWaitlist.findMany({
    where: { salonId: salon.id, status: "WAITING" },
    include: {
      service: { select: { id: true, name: true } },
      stylist: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const waitlist = await Promise.all(
    entries.map(async (e) => {
      let estimatedWaitMin = e.estimatedWaitMin;
      let nextAvailable = null as Awaited<
        ReturnType<typeof findNextAvailableWalkIns>
      >[0] | null;
      if (e.serviceId) {
        const options = await findNextAvailableWalkIns({
          salonId: salon.id,
          serviceId: e.serviceId,
          stylistId: e.stylistId,
        });
        nextAvailable = options[0] || null;
        estimatedWaitMin = options[0]?.waitMinutes ?? estimatedWaitMin;
      }
      return { ...e, estimatedWaitMin, nextAvailable };
    })
  );

  return NextResponse.json({ waitlist });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({ where: { slug } });
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "seat") {
    const id = String(body.id || "");
    const entry = await prisma.walkInWaitlist.findFirst({
      where: { id, salonId: salon.id, status: "WAITING" },
    });
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!entry.serviceId) {
      return NextResponse.json({ error: "Assign a service before seating" }, { status: 400 });
    }
    const options = await findNextAvailableWalkIns({
      salonId: salon.id,
      serviceId: entry.serviceId,
      stylistId: entry.stylistId,
    });
    if (!options[0]) {
      return NextResponse.json({ error: "No open slot yet" }, { status: 409 });
    }
    const result = await createWalkInAppointment({
      salonId: salon.id,
      stylistId: options[0].stylistId,
      serviceId: entry.serviceId,
      clientName: entry.clientName,
      clientPhone: entry.clientPhone,
      notes: entry.note,
      startsAt: new Date(options[0].startsAt),
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const updated = await prisma.walkInWaitlist.update({
      where: { id: entry.id },
      data: {
        status: "SEATED",
        seatedAt: new Date(),
        appointmentId: result.appointment.id,
        stylistId: result.appointment.stylistId,
        estimatedWaitMin: 0,
      },
    });
    return NextResponse.json({ entry: updated, appointment: result.appointment });
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
