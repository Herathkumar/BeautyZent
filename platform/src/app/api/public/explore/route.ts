import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  BUSINESS_TYPES,
  businessTypeLabel,
  normalizeBusinessType,
} from "@/lib/marketplace";
import { getMarketplaceAvailability } from "@/lib/marketplace-availability";
import type { PromotionRuleType } from "@/lib/promotions";
import { generatePromotionRuleLabel } from "@/lib/promotions";

export const dynamic = "force-dynamic";

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index]);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

/**
 * Public marketplace directory search.
 * GET /api/public/explore?q=&city=&type=&date=&maxPrice=&rewards=&sort=&limit=
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = String(url.searchParams.get("q") || "").trim();
  const city = String(url.searchParams.get("city") || "").trim();
  const typeRaw = String(url.searchParams.get("type") || "").trim();
  const type = typeRaw ? normalizeBusinessType(typeRaw) : null;
  const dateRaw = String(url.searchParams.get("date") || "").trim();
  const date = isCalendarDate(dateRaw) ? dateRaw : "";
  if (dateRaw && !date) {
    return NextResponse.json({ error: "Date must be YYYY-MM-DD." }, { status: 400 });
  }
  const maxPriceRaw = Number(url.searchParams.get("maxPrice") || 0);
  const maxPriceCents =
    Number.isFinite(maxPriceRaw) && maxPriceRaw > 0
      ? Math.min(Math.round(maxPriceRaw * 100), 1_000_000)
      : null;
  const rewardsOnly = url.searchParams.get("rewards") === "1";
  const requestedSort = String(url.searchParams.get("sort") || "name");
  const sort =
    ["name", "price", "availability"].includes(requestedSort) &&
    (requestedSort !== "availability" || date)
      ? requestedSort
      : "name";
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 48), 1), 100);

  const rows = await prisma.salon.findMany({
    where: {
      active: true,
      listingStatus: "PUBLISHED",
      ...(type ? { businessType: type } : {}),
      AND: [
        ...(city
          ? [
              {
                OR: [
                  { city: { contains: city, mode: "insensitive" as const } },
                  { region: { contains: city, mode: "insensitive" as const } },
                  { address: { contains: city, mode: "insensitive" as const } },
                ],
              },
            ]
          : []),
        ...(q
          ? [{
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
              { city: { contains: q, mode: "insensitive" as const } },
              { address: { contains: q, mode: "insensitive" as const } },
              {
                services: {
                  some: {
                    active: true,
                    ...(maxPriceCents
                      ? { priceCents: { lte: maxPriceCents } }
                      : {}),
                    OR: [
                      { name: { contains: q, mode: "insensitive" as const } },
                      { description: { contains: q, mode: "insensitive" as const } },
                      { category: { contains: q, mode: "insensitive" as const } },
                    ],
                  },
                },
              },
            ],
          }]
          : []),
        ...(maxPriceCents
          ? [{ services: { some: { active: true, priceCents: { lte: maxPriceCents } } } }]
          : []),
        ...(rewardsOnly
          ? [
              {
                OR: [
                  { loyaltyEnabled: true },
                  {
                    discountsEnabled: true,
                    promotionRules: { some: { enabled: true } },
                  },
                ],
              },
            ]
          : []),
      ],
    },
    orderBy: [{ name: "asc" }],
    take: 100,
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
      services: {
        where: {
          active: true,
          ...(maxPriceCents ? { priceCents: { lte: maxPriceCents } } : {}),
        },
        orderBy: [{ priceCents: "asc" }, { sortOrder: "asc" }],
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          priceCents: true,
          durationMin: true,
        },
      },
    },
  });

  const query = q.toLowerCase();
  const prepared = rows.map((business) => {
    const matchingServices = query
      ? business.services.filter((service) =>
          [service.name, service.description, service.category]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query))
        )
      : [];
    const relevantServices = matchingServices.length
      ? matchingServices
      : business.services;
    return {
      business,
      relevantServices,
      minPriceCents: relevantServices.length
        ? Math.min(...relevantServices.map((service) => service.priceCents))
        : null,
    };
  });

  const withAvailability = await mapWithConcurrency(
    prepared,
    5,
    async (item) => ({
      ...item,
      availability: date
        ? await getMarketplaceAvailability({
            salonId: item.business.id,
            date,
            serviceIds: item.relevantServices.map((service) => service.id),
          })
        : null,
    })
  );
  const available = date
    ? withAvailability.filter((item) => item.availability)
    : withAvailability;

  available.sort((a, b) => {
    if (sort === "price") {
      return (
        (a.minPriceCents ?? Number.MAX_SAFE_INTEGER) -
          (b.minPriceCents ?? Number.MAX_SAFE_INTEGER) ||
        a.business.name.localeCompare(b.business.name)
      );
    }
    if (sort === "availability" && date) {
      return (
        new Date(a.availability!.earliestAt).getTime() -
          new Date(b.availability!.earliestAt).getTime() ||
        a.business.name.localeCompare(b.business.name)
      );
    }
    return a.business.name.localeCompare(b.business.name);
  });

  const resultRows = available.slice(0, limit);
  const discountSalonIds = resultRows
    .filter((item) => item.business.discountsEnabled)
    .map((item) => item.business.id);
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
    businesses: resultRows.map(({ business: b, relevantServices, minPriceCents, availability }) => {
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
        minPriceCents,
        matchedServices: relevantServices.slice(0, 3).map((service) => ({
          id: service.id,
          name: service.name,
          durationMin: service.durationMin,
          priceCents: service.priceCents,
        })),
        availability,
        coverUrl: b.coverUpdatedAt
          ? `/api/public/cover/${b.id}?v=${b.coverUpdatedAt.getTime()}`
          : null,
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
    filters: {
      q,
      city,
      type,
      date: date || null,
      maxPrice: maxPriceCents ? maxPriceCents / 100 : null,
      rewards: rewardsOnly,
      sort,
    },
  });
}
