import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSessionForSalon } from "@/lib/client-auth";
import { lookPhotoUrl, normalizeCaption } from "@/lib/look-photos";

type Ctx = { params: Promise<{ slug: string; id: string; photoId: string }> };

async function resolveOwnedPhoto(slug: string, id: string, photoId: string) {
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!salon) {
    return { error: NextResponse.json({ error: "Salon not found" }, { status: 404 }) };
  }
  const session = await getClientSessionForSalon(salon.id);
  if (!session) {
    return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  }
  const photo = await prisma.appointmentPhoto.findFirst({
    where: {
      id: photoId,
      appointmentId: id,
      salonId: salon.id,
      clientId: session.clientId,
    },
    select: { id: true },
  });
  if (!photo) {
    return { error: NextResponse.json({ error: "Photo not found." }, { status: 404 }) };
  }
  return { photo };
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { slug, id, photoId } = await params;
  const resolved = await resolveOwnedPhoto(slug, id, photoId);
  if ("error" in resolved) return resolved.error;

  const body = await req.json().catch(() => ({}));
  const updated = await prisma.appointmentPhoto.update({
    where: { id: resolved.photo.id },
    data: { caption: normalizeCaption(body?.caption) },
    select: { id: true, caption: true, createdAt: true },
  });

  return NextResponse.json({
    photo: { ...updated, url: lookPhotoUrl(slug, updated.id) },
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { slug, id, photoId } = await params;
  const resolved = await resolveOwnedPhoto(slug, id, photoId);
  if ("error" in resolved) return resolved.error;

  await prisma.appointmentPhoto.delete({ where: { id: resolved.photo.id } });
  return NextResponse.json({ ok: true });
}
