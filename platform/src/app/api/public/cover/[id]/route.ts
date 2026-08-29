import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Serves marketplace cover image bytes for a published (or any) business. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const salon = await prisma.salon.findUnique({
    where: { id },
    select: { coverData: true, coverMime: true, active: true, listingStatus: true },
  });
  if (!salon?.coverData?.length) {
    return NextResponse.json({ error: "No cover" }, { status: 404 });
  }
  // Allow cover for published listings; also DRAFT for platform preview later.
  return new NextResponse(Buffer.from(salon.coverData), {
    headers: {
      "Content-Type": salon.coverMime || "image/jpeg",
      // Covers can be replaced from Platform Configure. Do not let an
      // unversioned browser/CDN response hide a freshly uploaded image.
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
