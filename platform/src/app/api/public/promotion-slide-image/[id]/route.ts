import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const slide = await prisma.promotionSlide.findUnique({
    where: { id },
    select: {
      imageData: true,
      imageMime: true,
      enabled: true,
      salon: { select: { active: true } },
    },
  });
  if (!slide || !slide.enabled || !slide.salon.active || !slide.imageData?.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = Buffer.from(slide.imageData);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": slide.imageMime || "image/jpeg",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Length": String(body.length),
    },
  });
}
