import { NextResponse } from "next/server";
import { getSession, isSalonStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  decodePromotionSlideImageBase64,
  promotionSlideImageUrl,
} from "@/lib/promotion-slide-image";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !isSalonStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.promotionSlide.findFirst({
    where: { id, salonId: session.salonId },
    select: { id: true, title: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const decoded = decodePromotionSlideImageBase64(body.imageBase64, body.mimeType);
  if (!decoded.ok) {
    return NextResponse.json({ error: decoded.error }, { status: 400 });
  }

  const updated = await prisma.promotionSlide.update({
    where: { id: existing.id },
    data: {
      imageData: decoded.bytes,
      imageMime: decoded.mime,
      imageUpdatedAt: new Date(),
    },
    select: {
      id: true,
      title: true,
      enabled: true,
      sortOrder: true,
      durationSec: true,
      imageMime: true,
      imageUpdatedAt: true,
    },
  });

  const hasImage = Boolean(updated.imageUpdatedAt && updated.imageMime);
  return NextResponse.json({
    slide: {
      ...updated,
      hasImage,
      imageUrl: promotionSlideImageUrl({
        id: updated.id,
        hasImage,
        imageUpdatedAt: updated.imageUpdatedAt,
      }),
    },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !isSalonStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.promotionSlide.findFirst({
    where: { id, salonId: session.salonId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.promotionSlide.update({
    where: { id: existing.id },
    data: {
      imageData: null,
      imageMime: null,
      imageUpdatedAt: null,
    },
  });

  return NextResponse.json({ ok: true });
}
