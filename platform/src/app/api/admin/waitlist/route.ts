import { NextResponse } from "next/server";
import { getSession, isSalonStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  findNextAvailableWalkIns,
  listWaitlistWithOptions,
  seatWaitlistGuest,
} from "@/lib/walk-in";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !isSalonStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const includeOptions = new URL(req.url).searchParams.get("options") === "1";
  const waitlist = await listWaitlistWithOptions(session.salonId, { includeOptions });
  return NextResponse.json({ waitlist });
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
    const stylistId = body.stylistId ? String(body.stylistId) : null;
    const result = await seatWaitlistGuest({
      salonId: session.salonId,
      entryId: entry.id,
      stylistId,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
