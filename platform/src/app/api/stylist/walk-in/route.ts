import { NextResponse } from "next/server";
import { getStylistSession } from "@/lib/auth";
import { createWalkInAppointment, findNextAvailableWalkIns } from "@/lib/walk-in";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getStylistSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const serviceId = url.searchParams.get("serviceId") || "";

  const services = await prisma.service.findMany({
    where: {
      salonId: session.salonId,
      active: true,
      stylists: { some: { stylistId: session.stylistId } },
    },
    select: { id: true, name: true, durationMin: true, priceCents: true },
    orderBy: { sortOrder: "asc" },
  });

  if (!serviceId) {
    return NextResponse.json({
      services,
      options: [],
      nextAvailable: null,
      stylistId: session.stylistId,
    });
  }

  const options = await findNextAvailableWalkIns({
    salonId: session.salonId,
    serviceId,
    stylistId: session.stylistId,
  });

  return NextResponse.json({
    options,
    nextAvailable: options[0] || null,
    services,
    stylistId: session.stylistId,
  });
}

export async function POST(req: Request) {
  const session = await getStylistSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const serviceId = String(body.serviceId || "");
  const clientName = String(body.clientName || "").trim() || "Walk-in";
  const clientPhone = body.clientPhone != null ? String(body.clientPhone) : "";
  const notes = body.notes != null ? String(body.notes) : "";

  if (!serviceId) {
    return NextResponse.json({ error: "serviceId required" }, { status: 400 });
  }

  const linked = await prisma.stylistService.findFirst({
    where: { stylistId: session.stylistId, serviceId },
  });
  if (!linked) {
    return NextResponse.json({ error: "Service not linked to you" }, { status: 400 });
  }

  const result = await createWalkInAppointment({
    salonId: session.salonId,
    stylistId: session.stylistId,
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
