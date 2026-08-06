import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSessionForSalon } from "@/lib/client-auth";

/** Serves look-book bytes. Private to the member who uploaded them. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; photoId: string }> }
) {
  const { slug, photoId } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!salon) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await getClientSessionForSalon(salon.id);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const photo = await prisma.appointmentPhoto.findFirst({
    where: { id: photoId, salonId: salon.id, clientId: session.clientId },
    select: { photoData: true, photoMime: true },
  });
  if (!photo?.photoData?.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = Buffer.from(photo.photoData);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": photo.photoMime || "image/jpeg",
      "Cache-Control": "private, max-age=3600",
      "Content-Length": String(body.length),
    },
  });
}
