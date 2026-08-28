import { NextResponse } from "next/server";
import { syncAppointmentToGoogle } from "@/lib/calendar";
import { updateAppointmentStatus, stylistChairOccupied } from "@/lib/complete-appointment";
import { assertDisplayAccess } from "@/lib/display-pin";
import { prisma } from "@/lib/prisma";

const APPT_INCLUDE = {
  client: { select: { id: true, name: true, phone: true } },
  service: {
    select: { id: true, name: true, durationMin: true, priceCents: true, category: true },
  },
  stylist: { select: { id: true, name: true, color: true } },
} as const;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { id: true, slug: true, displayPinHash: true, displayPinSetAt: true },
  });
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  const locked = await assertDisplayAccess(salon, req);
  if (locked) return locked;

  const body = await req.json();
  const status = typeof body.status === "string" ? body.status : null;
  const allowed = ["BOOKED", "CHECKED_IN", "COMPLETED", "CANCELLED", "NO_SHOW"];
  if (status && !allowed.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const startsAtIso = typeof body.startsAt === "string" ? body.startsAt.trim() : "";
  const nextStylistId =
    typeof body.stylistId === "string" && body.stylistId.trim()
      ? body.stylistId.trim()
      : null;

  if (!status && !startsAtIso && !nextStylistId) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const appt = await prisma.appointment.findFirst({
    where: { id, salonId: salon.id },
  });
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (startsAtIso) {
    if (!["BOOKED", "CHECKED_IN"].includes(appt.status)) {
      return NextResponse.json(
        { error: "Only open bookings can be rescheduled" },
        { status: 400 }
      );
    }
    const start = new Date(startsAtIso);
    if (Number.isNaN(start.getTime())) {
      return NextResponse.json({ error: "Invalid start time" }, { status: 400 });
    }
    const durationMs = Math.max(
      15 * 60_000,
      appt.endsAt.getTime() - appt.startsAt.getTime()
    );
    const end = new Date(start.getTime() + durationMs);
    const stylistId = nextStylistId || appt.stylistId;

    const target = await prisma.stylist.findFirst({
      where: { id: stylistId, salonId: salon.id, active: true },
      select: { id: true },
    });
    if (!target) {
      return NextResponse.json({ error: "Stylist not found" }, { status: 404 });
    }

    const clash = await prisma.appointment.findFirst({
      where: {
        salonId: salon.id,
        stylistId,
        id: { not: appt.id },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        startsAt: { lt: end },
        endsAt: { gt: start },
      },
      select: { id: true },
    });
    if (clash) {
      return NextResponse.json({ error: "That time is not available" }, { status: 409 });
    }

    await prisma.appointment.update({
      where: { id: appt.id },
      data: {
        startsAt: start,
        endsAt: end,
        stylistId,
        status: appt.status === "CHECKED_IN" && start.getTime() > Date.now() ? "BOOKED" : appt.status,
      },
    });
  } else if (nextStylistId && nextStylistId !== appt.stylistId) {
    if (!["BOOKED", "CHECKED_IN"].includes(appt.status)) {
      return NextResponse.json(
        { error: "Only open bookings can be reassigned" },
        { status: 400 }
      );
    }

    const target = await prisma.stylist.findFirst({
      where: { id: nextStylistId, salonId: salon.id, active: true },
      select: { id: true },
    });
    if (!target) {
      return NextResponse.json({ error: "Stylist not found" }, { status: 404 });
    }

    const occupied = await stylistChairOccupied({
      salonId: salon.id,
      stylistId: nextStylistId,
      exceptAppointmentId: appt.id,
    });
    if (occupied) {
      return NextResponse.json({ error: "Stylist chair is occupied" }, { status: 409 });
    }

    await prisma.appointment.update({
      where: { id: appt.id },
      data: { stylistId: nextStylistId },
    });
  }

  if (status) {
    const result = await updateAppointmentStatus({
      appointmentId: appt.id,
      status,
      chargedCents: body.chargedCents,
      tipCents: body.tipCents,
      chargedByUserId: null,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    void syncAppointmentToGoogle(result.appointment.id).catch(() => null);
    return NextResponse.json({ appointment: result.appointment });
  }

  const updated = await prisma.appointment.findFirst({
    where: { id: appt.id, salonId: salon.id },
    include: APPT_INCLUDE,
  });
  void syncAppointmentToGoogle(appt.id).catch(() => null);
  return NextResponse.json({ appointment: updated });
}
