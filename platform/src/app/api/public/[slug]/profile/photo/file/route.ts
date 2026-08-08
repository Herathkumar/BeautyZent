import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSessionForSalon } from "@/lib/client-auth";

/** Serves the member's own selfie bytes. Private to the signed-in member. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!salon) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await getClientSessionForSalon(salon.id);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const client = await prisma.client.findUnique({
    where: { id: session.clientId },
    select: { photoData: true, photoMime: true },
  });
  if (!client?.photoData?.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = Buffer.from(client.photoData);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": client.photoMime || "image/jpeg",
      "Cache-Control": "private, max-age=3600",
      "Content-Length": String(body.length),
    },
  });
}
