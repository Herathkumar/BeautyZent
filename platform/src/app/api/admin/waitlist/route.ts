import { NextResponse } from "next/server";
import { getSession, isSalonStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createWalkInAppointment, findNextAvailableWalkIns } from "@/lib/walk-in";

export async function GET() {
  const session = await getSession();
  if (!session || !isSalonStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await prisma.walkInWaitlist.findMany({
    where: { salonId: session.salonId, status: "WAITING" },
    include: {
      service: { select: { id: true, name: true, durationMin: true } },
      stylist: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Refresh wait estimates
  const refreshed = await Promise.all(
    entries.map(async (e) => {
      if (!e.serviceId) {
        return { ...e, estimatedWaitMin: e.estimatedWaitMin };
      }
      const options = await findNextAvailableWalkIns({
        salonId: session.salonId,
        serviceId: e.serviceId,
        stylistId: e.stylistId,
      });
      const wait = options[0]?.waitMinutes ?? e.estimatedWaitMin;
      if (wait != null && wait !== e.estimatedWaitMin) {
        await prisma.walkInWaitlist.update({
          where: { id: e.id },
          data: { estimatedWaitMin: wait },
        });
      }
      return {
        ...e,
        estimatedWaitMin: wait,
        nextAvailable: options[0] || null,
      };
    })
  );

  return NextResponse.json({ waitlist: refreshed });
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

  const clientName = String(body.clientName || "").trim() || "Walk-in guest";
  const clientPhone = body.clientPhone != null ? String(body.clientPhone).trim() : "";
  const serviceId = body.serviceId ? String(body.serviceId) : null;
  const stylistId = body.stylistId ? String(body.stylistId) : null;
  const note = body.note != null ? String(body.note) : null;

  let estimatedWaitMin: number | null = null;
  if (serviceId) {
    const options = await findNextAvailableWalkIns({
      salonId: session.salonId,
      serviceId,
      stylistId,
    });
    estimatedWaitMin = options[0]?.waitMinutes ?? null;
  }

  const entry = await prisma.walkInWaitlist.create({
    data: {
      salonId: session.salonId,
      clientName,
      clientPhone: clientPhone || null,
      serviceId,
      stylistId,
      note,
      status: "WAITING",
      estimatedWaitMin,
    },
    include: {
      service: { select: { id: true, name: true, durationMin: true } },
      stylist: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ entry });
}

export async function PATCH(req: Request) {
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

  const id = String(body.id || "");
  const action = String(body.action || "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const entry = await prisma.walkInWaitlist.findFirst({
    where: { id, salonId: session.salonId },
  });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "cancel") {
    const updated = await prisma.walkInWaitlist.update({
      where: { id: entry.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    return NextResponse.json({ entry: updated });
  }

  if (action === "seat") {
    if (entry.status !== "WAITING") {
      return NextResponse.json({ error: "Guest is not waiting" }, { status: 400 });
    }
    if (!entry.serviceId) {
      return NextResponse.json({ error: "Assign a service before seating" }, { status: 400 });
    }

    const options = await findNextAvailableWalkIns({
      salonId: session.salonId,
      serviceId: entry.serviceId,
      stylistId: entry.stylistId,
    });
    if (!options[0]) {
      return NextResponse.json(
        { error: "No open slot to seat this guest yet" },
        { status: 409 }
      );
    }

    const result = await createWalkInAppointment({
      salonId: session.salonId,
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
      include: {
        service: { select: { id: true, name: true } },
        stylist: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      entry: updated,
      appointment: result.appointment,
      waitMinutes: result.waitMinutes,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
