import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  BUSINESS_TYPES,
  businessTypeLabel,
  normalizeBusinessType,
} from "@/lib/marketplace";
import type { PromotionRuleType } from "@/lib/promotions";
import { generatePromotionRuleLabel } from "@/lib/promotions";

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
      loyaltyEnabled: true,
      discountsEnabled: true,
      loyaltyPointsPerDollar: true,
      loyaltyCentsPerPoint: true,
    },
  });

  const discountSalonIds = rows.filter((b) => b.discountsEnabled).map((b) => b.id);
  const rules =
    discountSalonIds.length > 0
      ? await prisma.promotionRule.findMany({
          where: { salonId: { in: discountSalonIds }, enabled: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            salonId: true,
            type: true,
            name: true,
            discountBps: true,
            discountCents: true,
            minVisits: true,
            minSpendCents: true,
          },
        })
      : [];

  const rulesBySalon = new Map<string, typeof rules>();
  for (const rule of rules) {
    const list = rulesBySalon.get(rule.salonId) || [];
    list.push(rule);
    rulesBySalon.set(rule.salonId, list);
  }

  return NextResponse.json({
    businesses: rows.map((b) => {
      const salonRules = b.discountsEnabled ? rulesBySalon.get(b.id) || [] : [];
      const promotions = salonRules.slice(0, 3).map((rule) => ({
        id: rule.id,
        name: rule.name,
        label:
          rule.name?.trim() ||
          generatePromotionRuleLabel({
            type: rule.type as PromotionRuleType,
            discountBps: rule.discountBps ?? 0,
            discountCents: rule.discountCents ?? 0,
            minVisits: rule.minVisits ?? 0,
            minSpendCents: rule.minSpendCents ?? 0,
          }),
      }));
      const hasRewards = b.loyaltyEnabled || promotions.length > 0;

      return {
        id: b.id,
        name: b.name,
        slug: b.slug,
        businessType: b.businessType,
        businessTypeLabel: businessTypeLabel(b.businessType),
        city: b.city,
        region: b.region,
        country: b.country,
        description: b.description,
        address: b.address,
        phone: b.phone,
        openHour: b.openHour,
        closeHour: b.closeHour,
        timezone: b.timezone,
        lat: b.lat,
        lng: b.lng,
        coverUrl: b.coverUpdatedAt ? `/api/public/cover/${b.id}` : null,
        bookUrl: `/book/${b.slug}`,
        rewards: {
          hasRewards,
          loyaltyEnabled: b.loyaltyEnabled,
          pointsPerDollar: b.loyaltyPointsPerDollar,
          centsPerPoint: b.loyaltyCentsPerPoint,
          promotions,
          morePromotions: Math.max(0, salonRules.length - promotions.length),
        },
      };
    }),
    types: BUSINESS_TYPES,
    filters: { q, city, type },
  });
}
