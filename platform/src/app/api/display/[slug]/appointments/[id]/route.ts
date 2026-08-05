import { NextResponse } from "next/server";
import { syncAppointmentToGoogle } from "@/lib/calendar";
import { updateAppointmentStatus } from "@/lib/complete-appointment";
import { assertDisplayAccess } from "@/lib/display-pin";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { id: true, slug: true, displayPinHash: true },
  });
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  const locked = await assertDisplayAccess(salon);
  if (locked) return locked;

  const body = await req.json();
  const status = body.status;
  const allowed = ["BOOKED", "CHECKED_IN", "COMPLETED", "CANCELLED", "NO_SHOW"];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const appt = await prisma.appointment.findFirst({
    where: { id, salonId: salon.id },
  });
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

  await syncAppointmentToGoogle(result.appointment.id);
  return NextResponse.json({ appointment: result.appointment });
}
