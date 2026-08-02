import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncAppointmentToGoogle } from "@/lib/calendar";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;
  const salon = await prisma.salon.findUnique({ where: { slug } });
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  const { status } = await req.json();
  const allowed = ["BOOKED", "CHECKED_IN", "COMPLETED", "CANCELLED", "NO_SHOW"];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const appt = await prisma.appointment.findFirst({
    where: { id, salonId: salon.id },
  });
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status },
  });
  await syncAppointmentToGoogle(updated.id);
  return NextResponse.json({ appointment: updated });
}
