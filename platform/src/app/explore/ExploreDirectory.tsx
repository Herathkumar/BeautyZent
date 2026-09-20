"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FavoriteBusinessButton } from "@/components/FavoriteBusinessButton";
import { BUSINESS_TYPES } from "@/lib/marketplace";

/** Short filter labels (title case). */
const EXPLORE_CATEGORY: Record<string, string> = {
  SALON: "Hair",
  BARBER: "Barbershop",
  SPA: "Spa & wellness",
  NAILS: "Nails",
  OTHER: "Beauty & lifestyle",
};

/** Card badge from businessType — uppercase, tracking-wide. */
const EXPLORE_CATEGORY_BADGE: Record<string, string> = {
  SALON: "HAIR",
  BARBER: "BARBER",
  SPA: "SPA",
  NAILS: "NAILS",
  OTHER: "BEAUTY",
  MEDSPA: "MEDSPA",
};

function exploreCategoryLabel(businessType: string, fallbackLabel: string) {
  return EXPLORE_CATEGORY[businessType] || fallbackLabel.replace(/\bsalon\b/gi, "house");
}

function exploreCategoryBadge(businessType: string, fallbackLabel: string) {
  const key = String(businessType || "").toUpperCase();
  if (EXPLORE_CATEGORY_BADGE[key]) return EXPLORE_CATEGORY_BADGE[key];
  const fromLabel = fallbackLabel
    .replace(/\bsalon\b/gi, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)[0];
  return (fromLabel || key || "BUSINESS").toUpperCase();
}

/** "from $25" — omit .00 unless there are cents. */
function formatExploreFromPrice(cents: number) {
  const hasCents = cents % 100 !== 0;
  const amount = hasCents ? (cents / 100).toFixed(2) : String(Math.round(cents / 100));
  return `from $${amount}`;
}

type BusinessCard = {
  id: string;
  name: string;
  slug: string;
  businessType: string;
  businessTypeLabel: string;
  city: string | null;
  region: string | null;
  address: string | null;
  description: string | null;
  coverUrl: string | null;
  bookUrl: string;
  openHour: number;
  closeHour: number;
  timezone: string;
  minPriceCents: number | null;
  matchedServices: {
    id: string;
    name: string;
    durationMin: number;
    priceCents: number;
  }[];
  availability: {
    earliestAt: string;
    serviceId: string;
    serviceName: string;
    priceCents: number;
  } | null;
  rewards?: {
    hasRewards: boolean;
    loyaltyEnabled: boolean;
    pointsPerDollar: number;
    centsPerPoint: number;
    promotions: { id: string; name: string; label: string }[];
    morePromotions: number;
  };
};

type AppliedFilters = {
  q: string;
  city: string;
  type: string;
  date: string;
  maxPrice: string;
  rewardsOnly: boolean;
  sort: string;
  requestId: number;
};

const EMPTY_FILTERS: AppliedFilters = {
  q: "",
  city: "",
  type: "",
  date: "",
  maxPrice: "",
  rewardsOnly: false,
  sort: "name",
  requestId: 0,
};

function localToday() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function slotLabel(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatHour(hour: number) {
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:00 ${period}`;
}

function IconScissors({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <circle cx="6" cy="6" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="18" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 7.5 20 18M8 16.5 20 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
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

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <rect x="4" y="5" width="16" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 10h16M9 3v4M15 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconGrid({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <rect x="4" y="4" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="14" y="4" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="4" y="14" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="14" y="14" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function ExploreDirectory() {
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [type, setType] = useState("");
  const [date, setDate] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [rewardsOnly, setRewardsOnly] = useState(false);
  const [sort, setSort] = useState("name");
  const [applied, setApplied] = useState<AppliedFilters>(EMPTY_FILTERS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [businesses, setBusinesses] = useState<BusinessCard[]>([]);
  const [moreOpen, setMoreOpen] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (applied.q) params.set("q", applied.q);
      if (applied.city) params.set("city", applied.city);
      if (applied.type) params.set("type", applied.type);
      if (applied.date) params.set("date", applied.date);
      if (applied.maxPrice) params.set("maxPrice", applied.maxPrice);
      if (applied.rewardsOnly) params.set("rewards", "1");
      if (applied.sort) params.set("sort", applied.sort);
      const res = await fetch(`/api/public/explore?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load businesses");
      setBusinesses(data.businesses || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load");
      setBusinesses([]);
    } finally {
      setBusy(false);
    }
  }, [applied]);

  useEffect(() => {
    void load();
  }, [load]);

  function applySearch() {
    setApplied({
      q: q.trim(),
      city: city.trim(),
      type,
      date,
      maxPrice,
      rewardsOnly,
      sort,
      requestId: Date.now(),
    });
  }

  function applySort(next: string) {
    setSort(next);
    setApplied((prev) => ({
      ...prev,
      sort: next,
      requestId: Date.now(),
    }));
  }

  function clearFilters() {
    setQ("");
    setCity("");
    setType("");
    setDate("");
    setMaxPrice("");
    setRewardsOnly(false);
    setSort("name");
    setApplied({ ...EMPTY_FILTERS, requestId: Date.now() });
  }

  const hasFilters = Boolean(q || city || type || date || maxPrice || rewardsOnly);
  const areaLabel = applied.city.trim() || "you";
  const houseWord = businesses.length === 1 ? "beauty house" : "beauty houses";
  const resultsLabel = `Near ${areaLabel} · ${businesses.length} ${houseWord}`;

  return (
    <div className="explore-luxe__shell explore-luxe__shell--directory">
      <div className="explore-luxe__stage">
        <header className="explore-luxe__hero explore-luxe__hero--photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="explore-luxe__hero-img"
            src="/hero-explore.jpg"
            alt=""
            fetchPriority="high"
          />
          <div className="explore-luxe__hero-veil" aria-hidden />
          <div className="explore-luxe__hero-inner">
            <div className="explore-luxe__hero-copy">
              <h1 className="explore-luxe__title">Discover exceptional beauty houses</h1>
              <p className="explore-luxe__lede">
                Hair, skin, nails, spa, wellness and lifestyle — curated near you.
              </p>
            </div>
          </div>
        </header>

        <form
          className="explore-luxe__search"
          onSubmit={(e) => {
            e.preventDefault();
            applySearch();
          }}
        >
          <div className="explore-luxe__search-pill">
            <label className="explore-luxe__field">
              <span>Service</span>
              <span className="explore-luxe__field-control">
                <IconScissors className="explore-luxe__field-icon explore-luxe__field-icon--lead" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Haircut, facial, nails…"
                />
              </span>
            </label>

            <label className="explore-luxe__field">
              <span>Location</span>
              <span className="explore-luxe__field-control">
                <IconPin className="explore-luxe__field-icon explore-luxe__field-icon--lead" />
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Toronto"
                />
              </span>
            </label>

            <label className="explore-luxe__field">
              <span>Date</span>
              <span
                className={`explore-luxe__field-control explore-luxe__field-control--date${
                  date ? "" : " is-empty"
                }`}
              >
                <IconCalendar className="explore-luxe__field-icon explore-luxe__field-icon--lead" />
                {!date ? (
                  <span className="explore-luxe__date-placeholder" aria-hidden>
                    Any date
                  </span>
                ) : null}
                <input
                  type="date"
                  min={localToday()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  aria-label={date ? "Date" : "Any date"}
                />
              </span>
            </label>

            <label className="explore-luxe__field">
              <span>Category</span>
              <span className="explore-luxe__field-control">
                <IconGrid className="explore-luxe__field-icon explore-luxe__field-icon--lead" />
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="">All categories</option>
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {exploreCategoryLabel(t.id, t.label)}
                    </option>
                  ))}
                </select>
              </span>
            </label>

            <button type="submit" disabled={busy} className="explore-luxe__search-btn">
              {busy ? "Searching…" : "Search"}
            </button>
          </div>

          <div className="explore-luxe__more">
            <button
              type="button"
              className="explore-luxe__more-toggle"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((v) => !v)}
            >
              {moreOpen ? "Hide filters" : "More filters"}
            </button>

            {moreOpen ? (
              <div className="explore-luxe__more-panel">
                <label className="explore-luxe__field">
                  <span>Max price</span>
                  <span className="explore-luxe__field-control">
                    <select value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}>
                      <option value="">Any price</option>
                      <option value="25">Up to $25</option>
                      <option value="50">Up to $50</option>
                      <option value="75">Up to $75</option>
                      <option value="100">Up to $100</option>
                      <option value="150">Up to $150</option>
                    </select>
                  </span>
                </label>

                <div className="explore-luxe__search-extras">
                  <label className="explore-luxe__check">
                    <input
                      type="checkbox"
                      checked={rewardsOnly}
                      onChange={(e) => setRewardsOnly(e.target.checked)}
                    />
                    Rewards and offers only
                  </label>
                  {hasFilters ? (
                    <button type="button" onClick={clearFilters} className="explore-luxe__clear">
                      Clear filters
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </form>
      </div>

      <div className="explore-luxe__directory-body">
        {error ? <p className="explore-luxe__error">{error}</p> : null}

        <section className="explore-luxe__results" aria-live="polite">
          {!busy && !error ? (
            <div className="explore-luxe__results-head">
              <p className="explore-luxe__results-meta">{resultsLabel}</p>
              <div className="explore-luxe__ornament" aria-hidden>
                <span />
                <i />
              </div>
              <label className="explore-luxe__results-sort">
                <span>Sort</span>
                <select
                  value={sort}
                  onChange={(e) => applySort(e.target.value)}
                  aria-label="Sort results"
                >
                  <option value="name">Business name</option>
                  <option value="price">Lowest price</option>
                  <option value="availability" disabled={!date && !applied.date}>
                    Earliest availability
                  </option>
                </select>
              </label>
            </div>
          ) : null}

          {!busy && businesses.length === 0 ? (
            <p className="explore-luxe__empty">
              No published businesses match yet.{" "}
              <Link href="/claim">List your business</Link>
            </p>
          ) : null}

          <div className="explore-luxe__cards">
            {businesses.map((b) => {
              const bookHref = `/book/${encodeURIComponent(b.slug)}?from=explore`;
              const menuHref = `/explore/${encodeURIComponent(b.slug)}`;
              const place =
                [b.city, b.region].filter(Boolean).join(" · ") ||
                b.address ||
                "Location coming soon";
              const category = exploreCategoryBadge(b.businessType, b.businessTypeLabel);

              return (
                <article key={b.id} className="explore-luxe__card">
                  <div className="explore-luxe__card-media">
                    <Link href={menuHref} aria-label={`View ${b.name} services`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={b.coverUrl || "/display-promo.jpg"} alt="" />
                    </Link>
                    <div className="explore-luxe__fav">
                      <FavoriteBusinessButton salonId={b.id} compact />
                    </div>
                  </div>

                  <div className="explore-luxe__card-body">
                    <p className="explore-luxe__card-type">{category}</p>
                    <h2 className="explore-luxe__card-name">
                      <Link href={menuHref}>{b.name}</Link>
                    </h2>

                    <p className="explore-luxe__card-place">
                      <IconPin className="h-3.5 w-3.5 shrink-0" />
                      <span>{place}</span>
                    </p>

                    <p className="explore-luxe__card-hours">
                      <IconClock className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Open today · {formatHour(b.openHour)} - {formatHour(b.closeHour)}
                      </span>
                    </p>

                    {b.matchedServices[0] ? (
                      <p className="explore-luxe__card-service">
                        {b.matchedServices[0].name}{" "}
                        {formatExploreFromPrice(
                          b.minPriceCents ?? b.matchedServices[0].priceCents,
                        )}
                      </p>
                    ) : null}

                    {b.availability ? (
                      <p className="explore-luxe__card-avail">
                        Available {slotLabel(b.availability.earliestAt, b.timezone)} ·{" "}
                        {b.availability.serviceName}
                      </p>
                    ) : null}

                    {b.rewards?.hasRewards ? (
                      <div
                        className="explore-luxe__card-rewards"
                        data-testid={`explore-rewards-${b.slug}`}
                      >
                        <span>Rewards available</span>
                        <span>
                          {b.rewards.loyaltyEnabled ? "Loyalty" : ""}
                          {b.rewards.loyaltyEnabled &&
                          b.rewards.promotions.length + b.rewards.morePromotions > 0
                            ? " · "
                            : ""}
                          {b.rewards.promotions.length + b.rewards.morePromotions > 0
                            ? `${b.rewards.promotions.length + b.rewards.morePromotions} offer${
                                b.rewards.promotions.length + b.rewards.morePromotions === 1
                                  ? ""
                                  : "s"
                              }`
                            : ""}
                        </span>
                      </div>
                    ) : null}

                    <div className="explore-luxe__card-actions">
                      <Link
                        href={menuHref}
                        className="explore-luxe__btn-menu"
                        data-testid={`explore-menu-${b.slug}`}
                      >
                        Services
                      </Link>
                      <Link
                        href={bookHref}
                        className="explore-luxe__btn-book"
                        data-testid={`explore-book-${b.slug}`}
                      >
                        Reserve
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <p className="explore-luxe__footer">
          Own a shop?{" "}
          <Link href="/claim">Claim or create your business ›</Link>
        </p>
      </div>
    </div>
  );
}
