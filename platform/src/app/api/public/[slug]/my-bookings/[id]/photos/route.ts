import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSessionForSalon } from "@/lib/client-auth";
import {
  MAX_PHOTOS_PER_APPOINTMENT,
  decodeLookPhoto,
  lookPhotoUrl,
  normalizeCaption,
} from "@/lib/look-photos";

type Ctx = { params: Promise<{ slug: string; id: string }> };

/** Resolve the salon + member session + owned appointment, or an error response. */
async function resolveOwnedAppointment(slug: string, id: string) {
  const salon = await prisma.salon.findUnique({ where: { slug } });
  if (!salon) {
    return { error: NextResponse.json({ error: "Salon not found" }, { status: 404 }) };
  }
  const session = await getClientSessionForSalon(salon.id);
  if (!session) {
    return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  }
  const appointment = await prisma.appointment.findFirst({
    where: { id, salonId: salon.id, clientId: session.clientId },
    select: { id: true, salonId: true, clientId: true, startsAt: true, status: true },
  });
  if (!appointment) {
    return { error: NextResponse.json({ error: "Booking not found." }, { status: 404 }) };
  }
  return { salon, session, appointment };
}

export async function GET(_req: Request, { params }: Ctx) {
  const { slug, id } = await params;
  const resolved = await resolveOwnedAppointment(slug, id);
  if ("error" in resolved) return resolved.error;

  const photos = await prisma.appointmentPhoto.findMany({
    where: { appointmentId: resolved.appointment.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, caption: true, createdAt: true },
  });

  return NextResponse.json({
    photos: photos.map((p) => ({ ...p, url: lookPhotoUrl(slug, p.id) })),
    max: MAX_PHOTOS_PER_APPOINTMENT,
  });
}

export async function POST(req: Request, { params }: Ctx) {
  const { slug, id } = await params;
  const resolved = await resolveOwnedAppointment(slug, id);
  if ("error" in resolved) return resolved.error;
  const { appointment } = resolved;

  if (appointment.status === "CANCELLED" || appointment.status === "NO_SHOW") {
    return NextResponse.json(
      { error: "You can only add photos to a visit that happened." },
      { status: 400 }
    );
  }
  if (appointment.startsAt.getTime() > Date.now()) {
    return NextResponse.json(
      { error: "Add photos after your visit." },
      { status: 400 }
    );
  }

  const count = await prisma.appointmentPhoto.count({
    where: { appointmentId: appointment.id },
  });
  if (count >= MAX_PHOTOS_PER_APPOINTMENT) {
    return NextResponse.json(
      { error: `Up to ${MAX_PHOTOS_PER_APPOINTMENT} photos per visit.` },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Photo required" }, { status: 400 });

  const decoded = decodeLookPhoto(body.imageBase64, body.mimeType);
  if (!decoded.ok) {
    return NextResponse.json({ error: decoded.error }, { status: 400 });
  }

  const created = await prisma.appointmentPhoto.create({
    data: {
      salonId: appointment.salonId,
      appointmentId: appointment.id,
      clientId: appointment.clientId,
      photoData: decoded.photo.bytes,
      photoMime: decoded.photo.mime,
      caption: normalizeCaption(body.caption),
    },
    select: { id: true, caption: true, createdAt: true },
  });

  return NextResponse.json({
    photo: { ...created, url: lookPhotoUrl(slug, created.id) },
  });
}