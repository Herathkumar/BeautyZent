import { notFound } from "next/navigation";
import { FavoriteBusinessButton } from "@/components/FavoriteBusinessButton";
import { businessTypeLabel, isPublicListing } from "@/lib/marketplace";
import { formatCad } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import type { PromotionRuleType } from "@/lib/promotions";
import { generatePromotionRuleLabel } from "@/lib/promotions";
import { ExploreHeroGallery, type ExploreGalleryPhoto } from "../ExploreHeroGallery";
import { ExploreMarketplaceNav } from "../ExploreMarketplaceNav";
import { ExploreServicesPanel } from "../ExploreServicesPanel";
import { ExploreStickyReserveBar } from "../ExploreStickyReserveBar";

export const dynamic = "force-dynamic";

const HEADER_RESERVE_ID = "explore-header-reserve";
const SHORT_BIO_MAX = 140;

const CATEGORY_BADGE: Record<string, string> = {
  SALON: "HAIR",
  BARBER: "BARBER",
  SPA: "SPA",
  NAILS: "NAILS",
  OTHER: "BEAUTY",
  MEDSPA: "MEDSPA",
  SKIN: "SKIN",
  MAKEUP: "MAKEUP",
  WELLNESS: "WELLNESS",
};

function businessCategoryBadge(businessType: string) {
  const key = String(businessType || "").toUpperCase();
  if (CATEGORY_BADGE[key]) return CATEGORY_BADGE[key];
  const label = businessTypeLabel(businessType)
    .replace(/\bsalon\b/gi, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)[0];
  return (label || key || "BUSINESS").toUpperCase();
}

function formatHour(hour: number) {
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:00 ${period}`;
}

/** "$70" — omit .00 unless there are cents. */
function formatPrice(cents: number) {
  const hasCents = cents % 100 !== 0;
  const amount = hasCents ? (cents / 100).toFixed(2) : String(Math.round(cents / 100));
  return `$${amount}`;
}

function clipShortBio(value: string | null | undefined) {
  const text = value?.trim();
  if (!text) return null;
  if (text.length <= SHORT_BIO_MAX) return text;
  return `${text.slice(0, SHORT_BIO_MAX - 1).trimEnd()}…`;
}

type ExploreListingExtras = {
  shortBio: string | null;
  photos: ExploreGalleryPhoto[];
};

/** Demo shortBios only — never inject lookbook images as the cover/gallery. */
const DEMO_SHORT_BIO: Record<string, string> = {
  fhsalon: "Neighbourhood salon for cuts, colour, and unhurried appointments.",
  demosalon: "Quiet chairs, precise cuts, and colour that feels like you.",
  "aaraby-beauty": "Family-run beauty house for cuts, colour, and calm evenings.",
};

/**
 * business.shortBio + business.photos.
 * Hero is always the business cover; extra gallery URLs only from stored photos.
 */
async function readExploreListingExtras(
  salonId: string,
  slug: string,
  coverUrl: string | null
): Promise<ExploreListingExtras> {
  let shortBio: string | null = null;
  let galleryUrls: string[] = [];

  try {
    const rows = await prisma.$queryRaw<
      { shortBio: string | null; explorePhotoUrls: string[] | null }[]
    >`
      SELECT "shortBio", "explorePhotoUrls"
      FROM "Salon"
      WHERE id = ${salonId}
      LIMIT 1
    `;
    shortBio = clipShortBio(rows[0]?.shortBio);
    galleryUrls = Array.isArray(rows[0]?.explorePhotoUrls)
      ? rows[0]!.explorePhotoUrls.filter((u) => typeof u === "string" && u.trim())
      : [];
  } catch {
    // Columns not migrated yet.
  }

  if (!shortBio) shortBio = clipShortBio(DEMO_SHORT_BIO[slug]);

  // Cover only for the hero. Thumbs appear only when real extra photos exist.
  const photos: ExploreGalleryPhoto[] = [];
  if (coverUrl) {
    photos.push({ id: `cover-${salonId}`, url: coverUrl });
  } else {
    photos.push({ id: "fallback", url: "/display-promo.jpg" });
  }
  galleryUrls.forEach((url, index) => {
    photos.push({ id: `photo-${salonId}-${index}`, url });
  });

  return { shortBio, photos };
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
    select: { id: true, name: true, description: true, active: true, listingStatus: true },
  });
  if (!salon || !isPublicListing(salon)) {
    return { title: "Business not found — BeautyZent" };
  }
  const { shortBio } = await readExploreListingExtras(salon.id, slug, null);
  return {
    title: `${salon.name} · Services — BeautyZent`,
    description: shortBio || salon.description?.trim() || `Service menu for ${salon.name}`,
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
  const coverUrl = salon.coverUpdatedAt
    ? `/api/public/cover/${salon.id}?v=${salon.coverUpdatedAt.getTime()}`
    : null;
  const location =
    [salon.city, salon.region].filter(Boolean).join(", ") ||
    salon.address?.trim() ||
    "Location coming soon";
  const categoryBadge = businessCategoryBadge(salon.businessType);
  const { shortBio, photos } = await readExploreListingExtras(salon.id, salon.slug, coverUrl);

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

  const startingCents =
    salon.services.length > 0
      ? Math.min(...salon.services.map((s) => s.priceCents))
      : null;
  const startingPriceLabel =
    startingCents != null ? formatPrice(startingCents) : null;

  return (
    <main className="explore-luxe explore-menu min-h-screen">
      <ExploreMarketplaceNav current="explore" />

      <div className="explore-menu__shell">
        <div className="explore-menu__column">
          <section className="explore-menu__hero">
            <ExploreHeroGallery photos={photos} />

            <div className="explore-menu__header">
              <p className="explore-menu__type">{categoryBadge}</p>
              <div className="explore-menu__header-actions">
                <a
                  id={HEADER_RESERVE_ID}
                  href="#services"
                  className="explore-luxe__btn-book explore-menu__reserve"
                >
                  Reserve
                </a>
                <div className="explore-menu__save">
                  <FavoriteBusinessButton salonId={salon.id} />
                </div>
              </div>
              <h1 className="explore-menu__name">{salon.name}</h1>
              <p className="explore-menu__meta explore-menu__meta--place">
                <IconPin className="h-3.5 w-3.5 shrink-0" />
                <span>{location}</span>
              </p>
              <p className="explore-menu__meta explore-menu__meta--hours">
                <IconClock className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Open today · {formatHour(salon.openHour)} – {formatHour(salon.closeHour)}
                </span>
              </p>
              {shortBio ? <p className="explore-menu__bio">{shortBio}</p> : null}
            </div>
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

          <section id="services" className="explore-menu__services">
            <h2 className="explore-menu__services-title">Services</h2>
            <ExploreServicesPanel services={salon.services} bookHref={bookHref} />
          </section>
        </div>

        {/* Mobile native-style CTA — desktop uses the sticky bar instead */}
        <div className="explore-menu__footer-cta">
          <a href={bookHref} className="explore-luxe__btn-book explore-menu__book-wide">
            Reserve at {salon.name}
          </a>
        </div>
      </div>

      <ExploreStickyReserveBar
        anchorId={HEADER_RESERVE_ID}
        businessName={salon.name}
        startingPriceLabel={startingPriceLabel}
        bookHref={bookHref}
      />
    </main>
  );
}
