import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSessionForSalon } from "@/lib/client-auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;
  const salon = await prisma.salon.findUnique({ where: { slug } });
  if (!salon) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await getClientSessionForSalon(salon.id);
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const pref = await prisma.appointmentStylePref.findFirst({
    where: { id, salonId: salon.id, clientId: session.clientId },
    select: { photoData: true, photoMime: true },
  });
  if (!pref) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(Buffer.from(pref.photoData), {
    headers: {
      "Content-Type": pref.photoMime || "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
