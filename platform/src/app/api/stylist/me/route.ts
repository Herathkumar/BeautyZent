import { NextResponse } from "next/server";
import { getStylistSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stylistPhotoUrl } from "@/lib/stylist-photo";

export async function GET() {
  const session = await getStylistSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stylist = await prisma.stylist.findUnique({
    where: { id: session.stylistId },
    include: { salon: { select: { name: true, slug: true, phone: true } } },
  });
  if (!stylist) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hasPhoto = Boolean(stylist.photoUpdatedAt && stylist.photoMime);
  return NextResponse.json({
    user: {
      name: session.name,
      email: session.email,
      role: session.role,
    },
    stylist: {
      id: stylist.id,
      name: stylist.name,
      bio: stylist.bio,
      color: stylist.color,
      gender: stylist.gender,
      hasPhoto,
      photoUrl: stylistPhotoUrl({
        id: stylist.id,
        gender: stylist.gender,
        hasPhoto,
        photoUpdatedAt: stylist.photoUpdatedAt,
      }),
      salon: stylist.salon,
    },
  });
}
