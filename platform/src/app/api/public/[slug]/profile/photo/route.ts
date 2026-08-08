import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSessionForSalon } from "@/lib/client-auth";
import {
  DEFAULT_CLIENT_AVATAR,
  MAX_CLIENT_PHOTO_BYTES,
  clientPhotoUrl,
} from "@/lib/client-photo";

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
  return { session };
}

export async function PUT(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const resolved = await resolveMember(slug);
  if ("error" in resolved) return resolved.error;

  const body = await req.json().catch(() => null);
  if (!body?.imageBase64) {
    return NextResponse.json({ error: "Photo required" }, { status: 400 });
  }

  const raw = String(body.imageBase64).replace(/^data:[^;]+;base64,/, "");
  const decoded = Buffer.from(raw, "base64");
  if (!decoded.length) {
    return NextResponse.json({ error: "Photo could not be read" }, { status: 400 });
  }
  if (decoded.length > MAX_CLIENT_PHOTO_BYTES) {
    return NextResponse.json(
      { error: "Photo is too large. Take a closer selfie and try again." },
      { status: 400 }
    );
  }

  const mime = String(body.mimeType || "image/jpeg").toLowerCase();
  if (!mime.startsWith("image/")) {
    return NextResponse.json({ error: "Image required" }, { status: 400 });
  }

  const bytes = new Uint8Array(decoded.byteLength);
  bytes.set(decoded);

  const updated = await prisma.client.update({
    where: { id: resolved.session.clientId },
    data: {
      photoData: bytes,
      photoMime: mime === "image/png" ? "image/png" : "image/jpeg",
      photoUpdatedAt: new Date(),
    },
    select: { photoUpdatedAt: true },
  });

  return NextResponse.json({
    hasPhoto: true,
    photoUrl: clientPhotoUrl(slug, {
      hasPhoto: true,
      photoUpdatedAt: updated.photoUpdatedAt,
    }),
    message: "Selfie saved.",
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const resolved = await resolveMember(slug);
  if ("error" in resolved) return resolved.error;

  await prisma.client.update({
    where: { id: resolved.session.clientId },
    data: { photoData: null, photoMime: null, photoUpdatedAt: null },
  });

  return NextResponse.json({
    hasPhoto: false,
    photoUrl: DEFAULT_CLIENT_AVATAR,
    message: "Photo removed.",
  });
}
