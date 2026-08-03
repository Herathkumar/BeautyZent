import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  MAX_PHOTO_BYTES,
  normalizeGender,
  stylistPhotoUrl,
} from "@/lib/stylist-photo";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "STYLIST" || !session.stylistId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const stylist = await prisma.stylist.findUnique({
    where: { id: session.stylistId },
    select: {
      id: true,
      name: true,
      gender: true,
      photoMime: true,
      photoUpdatedAt: true,
    },
  });
  if (!stylist) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const hasPhoto = Boolean(stylist.photoUpdatedAt && stylist.photoMime);
  return NextResponse.json({
    stylist: {
      id: stylist.id,
      name: stylist.name,
      gender: stylist.gender,
      hasPhoto,
      photoUrl: stylistPhotoUrl({ ...stylist, hasPhoto }),
    },
  });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "STYLIST" || !session.stylistId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const gender =
    body.gender != null ? normalizeGender(body.gender) : undefined;

  let photoData: Buffer | undefined;
  let photoMime: string | undefined;

  if (body.imageBase64 != null && String(body.imageBase64).length > 0) {
    const raw = String(body.imageBase64).replace(/^data:[^;]+;base64,/, "");
    try {
      photoData = Buffer.from(raw, "base64");
    } catch {
      return NextResponse.json({ error: "Invalid image data" }, { status: 400 });
    }
    if (!photoData.length) {
      return NextResponse.json({ error: "Empty image" }, { status: 400 });
    }
    if (photoData.length > MAX_PHOTO_BYTES) {
      return NextResponse.json(
        { error: "Photo is too large. Take a closer selfie and try again." },
        { status: 400 }
      );
    }
    const mime = String(body.mimeType || "image/jpeg").toLowerCase();
    if (!mime.startsWith("image/")) {
      return NextResponse.json({ error: "Image required" }, { status: 400 });
    }
    photoMime = mime === "image/png" ? "image/png" : "image/jpeg";
  }

  if (gender == null && photoData == null) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.stylist.update({
    where: { id: session.stylistId },
    data: {
      ...(gender != null ? { gender } : {}),
      ...(photoData
        ? {
            photoData,
            photoMime,
            photoUpdatedAt: new Date(),
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      gender: true,
      photoMime: true,
      photoUpdatedAt: true,
    },
  });

  const hasPhoto = Boolean(updated.photoUpdatedAt && updated.photoMime);
  return NextResponse.json({
    ok: true,
    stylist: {
      id: updated.id,
      name: updated.name,
      gender: updated.gender,
      hasPhoto,
      photoUrl: stylistPhotoUrl({ ...updated, hasPhoto }),
    },
    message: photoData ? "Photo updated." : "Profile updated.",
  });
}

export async function DELETE() {
  const session = await getSession();
  if (!session || session.role !== "STYLIST" || !session.stylistId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const updated = await prisma.stylist.update({
    where: { id: session.stylistId },
    data: {
      photoData: null,
      photoMime: null,
      photoUpdatedAt: null,
    },
    select: {
      id: true,
      name: true,
      gender: true,
      photoMime: true,
      photoUpdatedAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    stylist: {
      id: updated.id,
      name: updated.name,
      gender: updated.gender,
      hasPhoto: false,
      photoUrl: stylistPhotoUrl({ ...updated, hasPhoto: false }),
    },
    message: "Photo removed. Default avatar will show until you take a new selfie.",
  });
}
