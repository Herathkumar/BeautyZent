import { NextResponse } from "next/server";
import { getStylistSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  const session = await getStylistSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { appointmentId } = await params;
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, stylistId: session.stylistId },
    select: { id: true, bookingGroupId: true, salonId: true },
  });
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let pref = await prisma.appointmentStylePref.findUnique({
    where: { appointmentId: appt.id },
    select: { photoData: true, photoMime: true },
  });

  // Multi-service bookings store the preferred look on the group head only.
  if (!pref && appt.bookingGroupId) {
    const head = await prisma.appointment.findFirst({
      where: {
        salonId: appt.salonId,
        stylistId: session.stylistId,
        bookingGroupId: appt.bookingGroupId,
      },
      orderBy: { startsAt: "asc" },
      select: { id: true },
    });
    if (head) {
      pref = await prisma.appointmentStylePref.findUnique({
        where: { appointmentId: head.id },
        select: { photoData: true, photoMime: true },
      });
    }
  }

  if (!pref) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(Buffer.from(pref.photoData), {
    headers: {
      "Content-Type": pref.photoMime || "image/jpeg",
      "Cache-Control": "private, max-age=300",
    },
  });
}
