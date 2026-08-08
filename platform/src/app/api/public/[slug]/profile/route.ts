import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSessionForSalon, issueClientSession } from "@/lib/client-auth";
import { clientPhotoUrl } from "@/lib/client-photo";

type Ctx = { params: Promise<{ slug: string }> };

async function resolveMember(slug: string) {
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
  return { salon, session };
}

async function profilePayload(slug: string, clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      memberAt: true,
      preferredStylistId: true,
      photoUpdatedAt: true,
      photoMime: true,
    },
  });
  if (!client) return null;
  const hasPhoto = Boolean(client.photoMime && client.photoUpdatedAt);
  return {
    id: client.id,
    name: client.name,
    phone: client.phone,
    email: client.email,
    memberAt: client.memberAt,
    preferredStylistId: client.preferredStylistId,
    hasPhoto,
    photoUrl: clientPhotoUrl(slug, { hasPhoto, photoUpdatedAt: client.photoUpdatedAt }),
  };
}

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const resolved = await resolveMember(slug);
  if ("error" in resolved) return resolved.error;

  const client = await profilePayload(slug, resolved.session.clientId);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ client });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const resolved = await resolveMember(slug);
  if ("error" in resolved) return resolved.error;

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  if (name.length < 2) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const phone = String(body?.phone ?? "").trim();

  const updated = await prisma.client.update({
    where: { id: resolved.session.clientId },
    data: { name, phone: phone || null },
    select: { id: true, name: true, phone: true, email: true, salonId: true },
  });

  // The session carries the display name, so refresh it after a rename.
  await issueClientSession({
    id: updated.id,
    salonId: updated.salonId,
    name: updated.name,
    phone: updated.phone,
    email: updated.email,
  });

  const client = await profilePayload(slug, updated.id);
  return NextResponse.json({ client, message: "Profile updated." });
}
