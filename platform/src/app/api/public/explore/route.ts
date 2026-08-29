import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  BUSINESS_TYPES,
  businessTypeLabel,
  normalizeBusinessType,
} from "@/lib/marketplace";

export const dynamic = "force-dynamic";

/**
 * Public marketplace directory search.
 * GET /api/public/explore?q=&city=&type=&limit=
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = String(url.searchParams.get("q") || "").trim();
  const city = String(url.searchParams.get("city") || "").trim();
  const typeRaw = String(url.searchParams.get("type") || "").trim();
  const type = typeRaw ? normalizeBusinessType(typeRaw) : null;
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 48), 1), 100);

  const rows = await prisma.salon.findMany({
    where: {
      active: true,
      listingStatus: "PUBLISHED",
      ...(type ? { businessType: type } : {}),
      ...(city
        ? { city: { contains: city, mode: "insensitive" } }
        : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
              { address: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ name: "asc" }],
    take: limit,
    select: {
      id: true,
      name: true,
      slug: true,
      businessType: true,
      city: true,
      region: true,
      country: true,
      description: true,
      address: true,
      phone: true,
      openHour: true,
      closeHour: true,
      timezone: true,
      coverUpdatedAt: true,
      lat: true,
      lng: true,
    },
  });

  return NextResponse.json({
    businesses: rows.map((b) => ({
      ...b,
      businessTypeLabel: businessTypeLabel(b.businessType),
      coverUrl: b.coverUpdatedAt ? `/api/public/cover/${b.id}` : null,
      bookUrl: `/book/${b.slug}`,
    })),
    types: BUSINESS_TYPES,
    filters: { q, city, type },
  });
}
