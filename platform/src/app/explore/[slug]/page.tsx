import Link from "next/link";
import { notFound } from "next/navigation";
import { FavoriteBusinessButton } from "@/components/FavoriteBusinessButton";
import { businessTypeLabel, isPublicListing } from "@/lib/marketplace";
import { formatCad } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import type { PromotionRuleType } from "@/lib/promotions";
import { generatePromotionRuleLabel } from "@/lib/promotions";
import { serviceImageUrl } from "@/lib/service-image";
import { serviceIconSrc } from "@/lib/service-icons";

export const dynamic = "force-dynamic";

function categoryLabel(category: string) {
  if (category === "WOMEN") return "Women";
  if (category === "MEN") return "Men";
  return "Other";
}

function formatHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function IconPin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M12 21s6.5-5.2 6.5-11a6.5 6.5 0 1 0-13 0c0 5.8 6.5 11 6.5 11Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 8v4.5l3 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
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
    <main className="explore-luxe explore-menu min-h-screen">
      <header className="explore-luxe__topbar">
        <div className="explore-luxe__topbar-inner explore-menu__topbar-inner">
          <nav className="explore-luxe__top-links" aria-label="Business">
            <Link href="/">Home</Link>
            <Link href="/explore">Explore</Link>
            <a href={bookHref}>Book</a>
            <Link href="/account" className="explore-luxe__account-btn">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-4 w-4">
                <circle cx="12" cy="8.5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M5.5 20a6.5 6.5 0 0 1 13 0"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              My account
            </Link>
          </nav>
        </div>
      </header>

      <div className="explore-menu__shell">
        <section className="explore-menu__hero">
          <div className="explore-menu__cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverUrl || "/display-promo.jpg"} alt="" />
          </div>

          <article className="explore-menu__intro">
            <p className="explore-menu__type">{businessTypeLabel(salon.businessType)}</p>
            <h1 className="explore-menu__name">
              {salon.name}
            </h1>
            <p className="explore-menu__meta">
              <IconPin className="h-3.5 w-3.5 shrink-0" />
              <span>{location}</span>
            </p>
            <p className="explore-menu__meta">
              <IconClock className="h-3.5 w-3.5 shrink-0" />
              <span>
                Hours {formatHour(salon.openHour)}–{formatHour(salon.closeHour)}
              </span>
            </p>
            {salon.description?.trim() ? (
              <p className="explore-menu__desc">{salon.description.trim()}</p>
            ) : null}

            <div className="explore-menu__actions">
              <a href={bookHref} className="explore-luxe__btn-book">
                Book a visit
              </a>
              <div className="explore-menu__save">
                <FavoriteBusinessButton salonId={salon.id} />
              </div>
            </div>
            <Link href="/explore" className="explore-luxe__btn-menu explore-menu__back">
              Back to Explore
            </Link>
          </article>
        </section>

        {hasRewards ? (
          <section id="rewards" className="explore-menu__rewards">
            <h2>Rewards & promotions</h2>
            <p>Available when you book and check out as a member or guest.</p>
            <ul>
              {salon.loyaltyEnabled ? (
                <li>
                  <strong>Loyalty points</strong>
                  <span>
                    Earn {salon.loyaltyPointsPerDollar} pt
                    {salon.loyaltyPointsPerDollar === 1 ? "" : "s"} per $1 · 100 pts ≈{" "}
                    {valuePer100} off · redeem up to {salon.loyaltyMaxRedeemPercent}% of a visit
                  </span>
                </li>
              ) : null}
              {promotions.map((p) => (
                <li key={p.id}>
                  <strong>{p.label}</strong>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="explore-menu__services">
          <h2 className="explore-menu__services-title">
            Service menu
          </h2>
          <p className="explore-menu__services-lede">
            Browse what they offer, then book when you&apos;re ready.
          </p>

          {groups.length === 0 ? (
            <p className="explore-menu__empty">
              No services listed yet. You can still{" "}
              <a href={bookHref}>open booking</a>.
            </p>
          ) : (
            <div className="explore-menu__groups">
              {groups.map((group, groupIndex) => (
                <div key={group.key} className="explore-menu__group">
                  {groups.length > 1 ? (
                    <h3 className="explore-menu__group-label">
                      {categoryLabel(group.key)}
                    </h3>
                  ) : null}
                  <ul className="explore-menu__list">
                    {group.items.map((s, itemIndex) => {
                      const hasImage = Boolean(s.imageUpdatedAt && s.imageMime);
                      const imageUrl = serviceImageUrl({
                        id: s.id,
                        hasImage,
                        imageUpdatedAt: s.imageUpdatedAt,
                      });
                      const popular = groupIndex < 2 && itemIndex === 0;
                      return (
                        <li
                          key={s.id}
                          className={`explore-menu__item${popular ? " is-popular" : ""}`}
                        >
                          {hasImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imageUrl} alt="" className="explore-menu__thumb" />
                          ) : (
                            <span className="explore-menu__thumb explore-menu__thumb--empty">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={serviceIconSrc(s.name)} alt="" />
                            </span>
                          )}
                          <div className="explore-menu__item-copy">
                            <p className="explore-menu__item-name">
                              {s.name}
                              {popular ? (
                                <span className="explore-menu__badge">Most booked</span>
                              ) : null}
                            </p>
                            <p className="explore-menu__item-duration">{s.durationMin} min</p>
                            {s.description?.trim() ? (
                              <p className="explore-menu__item-desc">{s.description.trim()}</p>
                            ) : null}
                          </div>
                          <p className="explore-menu__item-price">{formatCad(s.priceCents)}</p>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="explore-menu__footer-cta">
          <a href={bookHref} className="explore-luxe__btn-book explore-menu__book-wide">
            Book at {salon.name}
          </a>
        </div>
      </div>
    </main>
  );
}
