import { NextResponse } from "next/server";
import { assertDisplayAccess } from "@/lib/display-pin";
import { promotionSlideImageUrl } from "@/lib/promotion-slide-image";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: {
      id: true,
      active: true,
      displayPinHash: true,
      displayPinSetAt: true,
      promoBoardEnabled: true,
      promoBoardIntervalSec: true,
      promoBoardSlideSec: true,
    },
  });
  if (!salon || !salon.active) {
    return NextResponse.json({ error: "Salon not found" }, { status: 404 });
  }

  const locked = await assertDisplayAccess(salon, req);
  if (locked) return locked;

  const slidesRaw = await prisma.promotionSlide.findMany({
    where: { salonId: salon.id, enabled: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      durationSec: true,
      imageMime: true,
      imageUpdatedAt: true,
    },
  });

  const defaultSlideSec = Math.min(60, Math.max(3, salon.promoBoardSlideSec || 8));
  const intervalSec = Math.min(600, Math.max(30, salon.promoBoardIntervalSec || 90));

  const slides = slidesRaw
    .map((slide) => {
      const hasImage = Boolean(slide.imageUpdatedAt && slide.imageMime);
      const imageUrl = promotionSlideImageUrl({
        id: slide.id,
        hasImage,
        imageUpdatedAt: slide.imageUpdatedAt,
      });
      if (!imageUrl) return null;
      return {
        id: slide.id,
        title: slide.title,
        imageUrl,
        durationSec: Math.min(
          60,
          Math.max(3, slide.durationSec ?? defaultSlideSec)
        ),
      };
    })
    .filter(Boolean);

  return NextResponse.json({
    enabled: salon.promoBoardEnabled && slides.length > 0,
    intervalSec,
    defaultSlideSec,
    slides,
  });
}
