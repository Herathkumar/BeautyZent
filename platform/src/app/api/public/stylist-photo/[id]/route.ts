import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const stylist = await prisma.stylist.findUnique({
    where: { id },
    select: {
      photoData: true,
      photoMime: true,
      active: true,
    },
  });
  if (!stylist || !stylist.active || !stylist.photoData?.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = Buffer.from(stylist.photoData);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": stylist.photoMime || "image/jpeg",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Length": String(body.length),
    },
  });
}
