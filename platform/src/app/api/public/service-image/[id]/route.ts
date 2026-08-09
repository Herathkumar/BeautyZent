import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const service = await prisma.service.findUnique({
    where: { id },
    select: {
      imageData: true,
      imageMime: true,
      active: true,
    },
  });
  if (!service || !service.active || !service.imageData?.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = Buffer.from(service.imageData);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": service.imageMime || "image/jpeg",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Length": String(body.length),
    },
  });
}
