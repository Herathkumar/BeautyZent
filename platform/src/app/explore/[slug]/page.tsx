import Link from "next/link";
import { notFound } from "next/navigation";
import { BeautyZentMarketHeader } from "@/components/BeautyZentBrand";
import { FavoriteBusinessButton } from "@/components/FavoriteBusinessButton";
import { businessTypeLabel, isPublicListing } from "@/lib/marketplace";
import { formatCad } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import type { PromotionRuleType } from "@/lib/promotions";
import { generatePromotionRuleLabel } from "@/lib/promotions";
import { serviceImageUrl } from "@/lib/service-image";

export const dynamic = "force-dynamic";

function categoryLabel(category: string) {
  if (category === "WOMEN") return "Women";
  if (category === "MEN") return "Men";
  return "Other";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { name: true, description: true, active: true, listingStatus: true },
  });
  if (!salon || !isPublicListing(salon)) {
    return { title: "Business not found — BeautyZent" };
  }
  return {
    title: `${salon.name} · Services — BeautyZent`,
    description: salon.description?.trim() || `Service menu for ${salon.name}`,
  };
}

export default async function ExploreBusinessMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    include: {
      services: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          durationMin: true,
          priceCents: true,
          imageMime: true,
          imageUpdatedAt: true,
        },
      },
      promotionRules: {
        where: { enabled: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          type: true,
          name: true,
          discountBps: true,
          discountCents: true,
          minVisits: true,
          minSpendCents: true,
        },
      },
    },
  });

  if (!salon || !isPublicListing(salon)) notFound();

  const bookHref = `/book/${encodeURIComponent(salon.slug)}?from=explore`;
  const coverUrl = salon.coverUpdatedAt ? `/api/public/cover/${salon.id}` : null;
  const location =
    [salon.city, salon.region].filter(Boolean).join(", ") ||
    salon.address?.trim() ||
    "Location coming soon";

  const promoRules = salon.discountsEnabled ? salon.promotionRules : [];
  const promotions = promoRules.map((rule) => ({
    id: rule.id,
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
  const hasRewards = salon.loyaltyEnabled || promotions.length > 0;
  const valuePer100 = formatCad(100 * (salon.loyaltyCentsPerPoint || 5));

  const groups = [
    { key: "WOMEN", items: salon.services.filter((s) => s.category === "WOMEN") },
    { key: "MEN", items: salon.services.filter((s) => s.category === "MEN") },
    {
      key: "OTHER",
      items: salon.services.filter((s) => s.category !== "WOMEN" && s.category !== "MEN"),
    },
  ].filter((g) => g.items.length > 0);

  return (
    <main className="min-h-screen bg-[#f7f2ec]">
      <BeautyZentMarketHeader
        right={
          <>
            <Link href="/explore" className="text-muted hover:text-ink">
              ← Explore
            </Link>
            <Link href="/account" className="text-muted hover:text-ink">
              My account
            </Link>
            <a href={bookHref} className="font-semibold text-ink hover:underline">
              Book
            </a>
          </>
        }
      />

      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <article className="overflow-hidden rounded-3xl border border-ink/12 bg-white/90 shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
          <div className="relative aspect-[16/10] w-full bg-[#f3eee8]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverUrl || "/display-promo.jpg"}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          <div className="space-y-3 p-5 sm:p-6">
            <p className="text-[0.68rem] font-semibold tracking-[0.14em] text-cocoa uppercase">
              {businessTypeLabel(salon.businessType)}
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-ink sm:text-4xl">
              {salon.name}
            </h1>
            <p className="text-sm text-muted">{location}</p>
            {salon.description?.trim() ? (
              <p className="text-sm text-ink-soft">{salon.description.trim()}</p>
            ) : null}
            <p className="text-xs text-muted">
              Hours {salon.openHour}:00–{salon.closeHour}:00
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href={bookHref}
                className="btn-solid rounded-full px-5 py-2.5 text-sm font-semibold"
              >
                Book a visit
              </a>
              <FavoriteBusinessButton salonId={salon.id} />
              <Link
                href="/explore"
                className="rounded-full border border-ink/15 px-5 py-2.5 text-sm font-semibold text-ink"
              >
                Back to Explore
              </Link>
            </div>
          </div>
        </article>

        {hasRewards ? (
          <section
            id="rewards"
            className="mt-8 rounded-3xl border border-[#c9a87c]/35 bg-[linear-gradient(135deg,#fbf6ef,#f3ebe3)] p-5 sm:p-6"
          >
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-ink">
              Rewards & promotions
            </h2>
            <p className="mt-1 text-sm text-muted">
              Available when you book and check out as a member or guest (rules vary).
            </p>
            <ul className="mt-4 space-y-2">
              {salon.loyaltyEnabled ? (
                <li className="rounded-2xl border border-ink/10 bg-white/80 px-4 py-3 text-sm text-ink">
                  <span className="font-semibold">Loyalty points</span>
                  <span className="mt-1 block text-muted">
                    Earn {salon.loyaltyPointsPerDollar} pt
                    {salon.loyaltyPointsPerDollar === 1 ? "" : "s"} per $1 · 100 pts ≈{" "}
                    {valuePer100} off · redeem up to {salon.loyaltyMaxRedeemPercent}% of a
                    visit
                  </span>
                </li>
              ) : null}
              {promotions.map((p) => (
                <li
                  key={p.id}
                  className="rounded-2xl border border-ink/10 bg-white/80 px-4 py-3 text-sm font-medium text-ink"
                >
                  {p.label}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-8">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-ink">
            Service menu
          </h2>
          <p className="mt-1 text-sm text-muted">
            Browse what they offer, then book when you&apos;re ready.
          </p>

          {groups.length === 0 ? (
            <p className="mt-6 rounded-3xl border border-dashed border-ink/20 bg-white/60 p-8 text-center text-sm text-muted">
              No services listed yet. You can still{" "}
              <a href={bookHref} className="font-semibold text-ink underline-offset-2 hover:underline">
                open booking
              </a>
              .
            </p>
          ) : (
            <div className="mt-5 space-y-6">
              {groups.map((group) => (
                <div key={group.key}>
                  {groups.length > 1 ? (
                    <h3 className="mb-3 text-xs font-semibold tracking-[0.16em] text-cocoa uppercase">
                      {categoryLabel(group.key)}
                    </h3>
                  ) : null}
                  <ul className="space-y-3">
                    {group.items.map((s) => {
                      const hasImage = Boolean(s.imageUpdatedAt && s.imageMime);
                      const imageUrl = serviceImageUrl({
                        id: s.id,
                        hasImage,
                        imageUpdatedAt: s.imageUpdatedAt,
                      });
                      return (
                        <li
                          key={s.id}
                          className="flex gap-3 rounded-2xl border border-ink/10 bg-white/90 p-3 sm:p-4"
                        >
                          {hasImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={imageUrl}
                              alt=""
                              className="h-16 w-16 shrink-0 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="h-16 w-16 shrink-0 rounded-xl bg-[#f3eee8]" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <p className="font-semibold text-ink">{s.name}</p>
                              <p className="shrink-0 text-sm font-semibold text-ink">
                                {formatCad(s.priceCents)}
                              </p>
                            </div>
                            {s.description?.trim() ? (
                              <p className="mt-1 line-clamp-2 text-sm text-muted">
                                {s.description.trim()}
                              </p>
                            ) : null}
                            <p className="mt-1 text-xs text-muted">{s.durationMin} min</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="mt-8 flex justify-center pb-10">
          <a
            href={bookHref}
            className="btn-solid rounded-full px-8 py-3 text-sm font-semibold"
          >
            Book at {salon.name}
          </a>
        </div>
      </div>
    </main>
  );
}
