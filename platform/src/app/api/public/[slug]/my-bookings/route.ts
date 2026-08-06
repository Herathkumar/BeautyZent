import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  CLIENT_CANCEL_HOURS,
  canCancelOnline,
  getClientSessionForSalon,
} from "@/lib/client-auth";
import { MAX_PHOTOS_PER_APPOINTMENT, lookPhotoUrl } from "@/lib/look-photos";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({ where: { slug } });
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  const session = await getClientSessionForSalon(salon.id);
  if (!session) {
    return NextResponse.json({ error: "Sign in to see your bookings." }, { status: 401 });
  }

  const now = new Date();
  const rows = await prisma.appointment.findMany({
    where: { salonId: salon.id, clientId: session.clientId },
    orderBy: { startsAt: "desc" },
    take: 40,
    include: {
      service: { select: { name: true, durationMin: true, priceCents: true } },
      stylist: { select: { id: true, name: true } },
      lookPhotos: {
        orderBy: { createdAt: "asc" },
        select: { id: true, caption: true, createdAt: true },
      },
    },
  });

  const appointments = rows.map((a) => ({
    id: a.id,
    startsAt: a.startsAt,
    endsAt: a.endsAt,
    status: a.status,
    notes: a.notes,
    service: a.service,
    stylist: a.stylist,
    canCancel:
      ["BOOKED", "CHECKED_IN"].includes(a.status) && canCancelOnline(a.startsAt, now),
    // Photos belong to visits that actually happened.
    canAddPhotos:
      a.startsAt.getTime() <= now.getTime() &&
      !["CANCELLED", "NO_SHOW"].includes(a.status),
    photos: a.lookPhotos.map((p) => ({
      id: p.id,
      caption: p.caption,
      createdAt: p.createdAt,
      url: lookPhotoUrl(slug, p.id),
    })),
  }));

  return NextResponse.json({
    appointments,
    cancelPolicyHours: CLIENT_CANCEL_HOURS,
    maxPhotosPerVisit: MAX_PHOTOS_PER_APPOINTMENT,
    timezone: salon.timezone,
  });
}
