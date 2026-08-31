import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MARKETPLACE_BOOK_THEME_ID } from "@/lib/marketplace-book-theme";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** Lightweight salon branding for splash / PWA shells (no catalog payload). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true,
      brandColor: true,
      accentColor: true,
      bookingThemeId: true,
      managerThemeId: true,
      stylistThemeId: true,
      active: true,
    },
  });
  if (!salon || !salon.active) {
    return NextResponse.json({ error: "Salon not found" }, { status: 404, headers: CORS_HEADERS });
  }
  return NextResponse.json(
    {
      salon: {
        name: salon.name,
        slug: salon.slug,
        brandColor: salon.brandColor,
        accentColor: salon.accentColor,
        bookingThemeId: MARKETPLACE_BOOK_THEME_ID,
        managerThemeId: salon.managerThemeId,
        stylistThemeId: salon.stylistThemeId,
      },
    },
    { headers: CORS_HEADERS }
  );
}
