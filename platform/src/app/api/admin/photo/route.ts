import { NextResponse } from "next/server";
import { getSession, isSalonStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_PHOTO_BYTES, managerPhotoUrl } from "@/lib/manager-photo";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const session = await getSession();
  if (!session || !isSalonStaff(session.role)) return unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, photoMime: true, photoUpdatedAt: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hasPhoto = Boolean(user.photoUpdatedAt && user.photoMime);
  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      hasPhoto,
      photoUrl: managerPhotoUrl({ ...user, hasPhoto }),
    },
  });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session || !isSalonStaff(session.role)) return unauthorized();

  const body = await req.json();
  if (body.imageBase64 == null || String(body.imageBase64).length === 0) {
    return NextResponse.json({ error: "Image required" }, { status: 400 });
  }

  const raw = String(body.imageBase64).replace(/^data:[^;]+;base64,/, "");
  let decoded: Buffer;
  try {
    decoded = Buffer.from(raw, "base64");
  } catch {
    return NextResponse.json({ error: "Invalid image data" }, { status: 400 });
  }
  if (!decoded.length) {
    return NextResponse.json({ error: "Empty image" }, { status: 400 });
  }
  if (decoded.length > MAX_PHOTO_BYTES) {
    return NextResponse.json(
      { error: "Photo is too large. Take a closer selfie and try again." },
      { status: 400 }
    );
  }
  const mime = String(body.mimeType || "image/jpeg").toLowerCase();
  if (!mime.startsWith("image/")) {
    return NextResponse.json({ error: "Image required" }, { status: 400 });
  }

  const photoBytes = new Uint8Array(decoded.byteLength);
  photoBytes.set(decoded);
  const photoMime = mime === "image/png" ? "image/png" : "image/jpeg";

  const updated = await prisma.user.update({
    where: { id: session.userId },
    data: {
      photoData: photoBytes,
      photoMime,
      photoUpdatedAt: new Date(),
    },
    select: { id: true, name: true, photoMime: true, photoUpdatedAt: true, stylistId: true },
  });

  if (updated.stylistId) {
    await prisma.stylist.update({
      where: { id: updated.stylistId },
      data: {
        photoData: photoBytes,
        photoMime,
        photoUpdatedAt: new Date(),
      },
    });
  }

  const hasPhoto = Boolean(updated.photoUpdatedAt && updated.photoMime);
  return NextResponse.json({
    ok: true,
    user: {
      id: updated.id,
      name: updated.name,
      hasPhoto,
      photoUrl: managerPhotoUrl({ ...updated, hasPhoto }),
    },
    message: "Photo updated.",
  });
}

export async function DELETE() {
  const session = await getSession();
  if (!session || !isSalonStaff(session.role)) return unauthorized();

  const updated = await prisma.user.update({
    where: { id: session.userId },
    data: {
      photoData: null,
      photoMime: null,
      photoUpdatedAt: null,
    },
    select: { id: true, name: true, photoMime: true, photoUpdatedAt: true, stylistId: true },
  });

  if (updated.stylistId) {
    await prisma.stylist.update({
      where: { id: updated.stylistId },
      data: {
        photoData: null,
        photoMime: null,
        photoUpdatedAt: null,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: updated.id,
      name: updated.name,
      hasPhoto: false,
      photoUrl: managerPhotoUrl({ ...updated, hasPhoto: false }),
    },
    message: "Photo removed. Default avatar will show until you take a new selfie.",
  });
}
