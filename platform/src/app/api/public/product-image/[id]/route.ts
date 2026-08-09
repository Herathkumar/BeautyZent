import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      imageData: true,
      imageMime: true,
      active: true,
    },
  });
  if (!product || !product.active || !product.imageData?.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = Buffer.from(product.imageData);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": product.imageMime || "image/jpeg",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Length": String(body.length),
    },
  });
}
