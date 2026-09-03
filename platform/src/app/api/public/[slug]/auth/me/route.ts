import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSessionForSalon } from "@/lib/client-auth";
import { clientPhotoUrl } from "@/lib/client-photo";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({ where: { slug } });
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  const session = await getClientSessionForSalon(salon.id);
  if (!session) return NextResponse.json({ client: null });

  const client = await prisma.client.findUnique({
    where: { id: session.clientId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      preferredStylistId: true,
      memberAt: true,
      photoData: true,
      photoUpdatedAt: true,
    },
  });

  if (!client) return NextResponse.json({ client: null });

  return NextResponse.json({
    client: {
      id: client.id,
      name: client.name,
      phone: client.phone,
      email: client.email,
      preferredStylistId: client.preferredStylistId,
      memberAt: client.memberAt,
      photoUrl: clientPhotoUrl(slug, client),
    },
  });
}
