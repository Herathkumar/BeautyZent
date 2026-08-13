import { NextResponse } from "next/server";
import { getSession, isSalonStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Signed-in manager salon branding for chrome / splash. */
export async function GET() {
  const session = await getSession();
  if (!session || !isSalonStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const salon = await prisma.salon.findUnique({
    where: { id: session.salonId },
    select: {
      name: true,
      slug: true,
      address: true,
      brandColor: true,
      accentColor: true,
      bookingThemeId: true,
      managerThemeId: true,
      stylistThemeId: true,
    },
  });
  if (!salon) {
    return NextResponse.json({ error: "Salon not found" }, { status: 404 });
  }

  return NextResponse.json(
    { salon },
    { headers: { "Cache-Control": "no-store" } }
  );
}
