import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSessionForSalon } from "@/lib/client-auth";
import {
  decodeStylePhoto,
  normalizeStylePrompt,
  stylePrefPublicUrl,
} from "@/lib/style-prefs";

type Ctx = { params: Promise<{ slug: string; id: string }> };

async function resolveUpdatableAppointment(slug: string, id: string) {
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
    select: {
      id: true,
      salonId: true,
      clientId: true,
      status: true,
      startsAt: true,
      bookingGroupId: true,
    },
  });
  if (!appointment) {
    return { error: NextResponse.json({ error: "Booking not found." }, { status: 404 }) };
  }
  if (!["BOOKED", "CHECKED_IN"].includes(appointment.status)) {
    return {
      error: NextResponse.json(
        { error: "You can only update the style preview on an active booking." },
        { status: 400 }
      ),
    };
  }
  if (appointment.startsAt.getTime() < Date.now() - 60 * 60 * 1000) {
    return {
      error: NextResponse.json(
        { error: "This visit has already started. Style preview can’t be changed." },
        { status: 400 }
      ),
    };
  }

  // Prefer the group head so multi-service visits share one preferred look.
  let targetId = appointment.id;
  if (appointment.bookingGroupId) {
    const head = await prisma.appointment.findFirst({
      where: {
        salonId: salon.id,
        clientId: session.clientId,
        bookingGroupId: appointment.bookingGroupId,
        status: { in: ["BOOKED", "CHECKED_IN"] },
      },
      orderBy: { startsAt: "asc" },
      select: { id: true },
    });
    if (head) targetId = head.id;
  }

  return { salon, session, appointmentId: targetId };
}

export async function PUT(req: Request, { params }: Ctx) {
  const { slug, id } = await params;
  const resolved = await resolveUpdatableAppointment(slug, id);
  if ("error" in resolved) return resolved.error;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Photo required" }, { status: 400 });

  const decoded = decodeStylePhoto(body.imageBase64, body.mimeType);
  if (!decoded.ok) {
    return NextResponse.json({ error: decoded.error }, { status: 400 });
  }

  const source =
    body.source === "AI" || body.source === "LOOKBOOK" || body.source === "UPLOAD"
      ? body.source
      : "UPLOAD";

  const pref = await prisma.appointmentStylePref.upsert({
    where: { appointmentId: resolved.appointmentId },
    create: {
      salonId: resolved.salon.id,
      appointmentId: resolved.appointmentId,
      clientId: resolved.session.clientId,
      photoData: decoded.photo.bytes,
      photoMime: decoded.photo.mime,
      source,
      prompt: normalizeStylePrompt(body.prompt),
    },
    update: {
      photoData: decoded.photo.bytes,
      photoMime: decoded.photo.mime,
      source,
      prompt: normalizeStylePrompt(body.prompt),
    },
    select: { id: true, source: true, prompt: true },
  });

  return NextResponse.json({
    stylePref: {
      ...pref,
      url: stylePrefPublicUrl(slug, pref.id),
    },
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { slug, id } = await params;
  const resolved = await resolveUpdatableAppointment(slug, id);
  if ("error" in resolved) return resolved.error;

  await prisma.appointmentStylePref.deleteMany({
    where: { appointmentId: resolved.appointmentId },
  });

  return NextResponse.json({ ok: true });
}
