"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BeautyZentLogo } from "@/components/BeautyZentBrand";
import { FavoriteBusinessButton } from "@/components/FavoriteBusinessButton";
import { BUSINESS_TYPES } from "@/lib/marketplace";
import { formatCad } from "@/lib/money";

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
  return `${String(hour).padStart(2, "0")}:00`;
}

function IconSearch({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
  const [hasSearched, setHasSearched] = useState(false);

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
    setHasSearched(true);
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

  return (
    <div className="explore-luxe__shell">
      <header className="explore-luxe__hero">
        <BeautyZentLogo
          variant="rose"
          size="lg"
          href={null}
          priority
          className="explore-luxe__hero-mark"
        />
        <div className="explore-luxe__hero-copy">
          <p className="explore-luxe__kicker">BeautyZent marketplace</p>
          <h1 className="explore-luxe__title">
            Explore businesses
          </h1>
          <p className="explore-luxe__lede">
            Discover trusted beauty, wellness and lifestyle businesses near you.
          </p>
        </div>
      </header>

      <form
        className="explore-luxe__search"
        onSubmit={(e) => {
          e.preventDefault();
          applySearch();
        }}
      >
        <label className="explore-luxe__field">
          <span>Business or service</span>
          <span className="explore-luxe__field-control">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Haircut, massage, nails…"
            />
            <IconSearch className="explore-luxe__field-icon" />
          </span>
        </label>

        <label className="explore-luxe__field">
          <span>Location</span>
          <span className="explore-luxe__field-control">
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Toronto"
            />
            <IconPin className="explore-luxe__field-icon" />
          </span>
        </label>

        <label className="explore-luxe__field">
          <span>Business type</span>
          <span className="explore-luxe__field-control">
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All types</option>
              {BUSINESS_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </span>
        </label>

        <label className="explore-luxe__field">
          <span>Available on</span>
          <span className="explore-luxe__field-control">
            <input
              type="date"
              min={localToday()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <IconCalendar className="explore-luxe__field-icon" />
          </span>
        </label>

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

        <label className="explore-luxe__field">
          <span>Sort</span>
          <span className="explore-luxe__field-control">
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="name">Business name</option>
              <option value="price">Lowest price</option>
              <option value="availability" disabled={!date}>
                Earliest availability
              </option>
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
          {q || city || type || date || maxPrice || rewardsOnly || sort !== "name" ? (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setCity("");
                setType("");
                setDate("");
                setMaxPrice("");
                setRewardsOnly(false);
                setSort("name");
                setHasSearched(false);
                setApplied({ ...EMPTY_FILTERS, requestId: Date.now() });
              }}
              className="explore-luxe__clear"
            >
              Clear filters
            </button>
          ) : null}
        </div>

        <button type="submit" disabled={busy} className="explore-luxe__search-btn">
          {busy ? "Searching…" : "Search"}
        </button>
      </form>

      {error ? <p className="explore-luxe__error">{error}</p> : null}

      <section className="explore-luxe__results" aria-live="polite">
        {!busy && !error ? (
          <div className="explore-luxe__results-head">
            <div className="explore-luxe__results-brand">
              <span className="explore-luxe__crown" aria-hidden>
                ♛
              </span>
              <p className="explore-luxe__results-wordmark">
                BeautyZent
              </p>
              <p className="explore-luxe__results-sub">Marketplace</p>
            </div>
            <p className="explore-luxe__results-meta">
              {hasSearched ? "Search results" : "Nearby businesses"}
              {" · "}
              {businesses.length} {businesses.length === 1 ? "business" : "businesses"} found
              {applied.date ? ` · ${applied.date}` : ""}
            </p>
            <div className="explore-luxe__ornament" aria-hidden>
              <span />
              <i />
              <span />
            </div>
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
              [b.city, b.region].filter(Boolean).join(", ") ||
              b.address ||
              "Location coming soon";

            return (
              <article key={b.id} className="explore-luxe__card">
                <div className="explore-luxe__card-media">
                  <Link href={menuHref} aria-label={`View ${b.name} menu`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.coverUrl || "/display-promo.jpg"} alt="" />
                  </Link>
                  <div className="explore-luxe__fav">
                    <FavoriteBusinessButton salonId={b.id} compact />
                  </div>
                </div>

                <div className="explore-luxe__card-body">
                  <p className="explore-luxe__card-type">{b.businessTypeLabel}</p>
                  <h2 className="explore-luxe__card-name">
                    <Link href={menuHref}>{b.name}</Link>
                  </h2>

                  <p className="explore-luxe__card-place">
                    <IconPin className="h-3.5 w-3.5 shrink-0" />
                    <span>{place}</span>
                  </p>

                  <div className="explore-luxe__card-rule" aria-hidden />

                  <p className="explore-luxe__card-hours">
                    <IconClock className="h-3.5 w-3.5 shrink-0" />
                    <span className="explore-luxe__hours-label">Hours</span>
                    <span className="explore-luxe__hours-value">
                      {formatHour(b.openHour)}–{formatHour(b.closeHour)}
                    </span>
                  </p>

                  {b.matchedServices[0] ? (
                    <p className="explore-luxe__card-service">
                      {b.matchedServices[0].name} • from{" "}
                      {formatCad(b.minPriceCents ?? b.matchedServices[0].priceCents)}
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
                      Menu
                    </Link>
                    <Link
                      href={bookHref}
                      className="explore-luxe__btn-book"
                      data-testid={`explore-book-${b.slug}`}
                    >
                      Book
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
  );
}
