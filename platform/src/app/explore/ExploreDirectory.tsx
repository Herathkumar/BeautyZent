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

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-4 flex justify-end">
        <Link
          href="/account"
          className="rounded-full border border-ink/15 bg-white/80 px-4 py-2 text-sm font-semibold text-ink"
        >
          My account
        </Link>
      </div>
      <header className="mb-8 flex max-w-3xl items-center gap-5">
        <BeautyZentLogo variant="rose" size="lg" href={null} priority />
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-cocoa uppercase">
            BeautyZent marketplace
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl leading-tight text-ink">
            Explore businesses
          </h1>
          <p className="mt-3 text-muted">
            Find salons, barbers, spas, and other beauty businesses. Book online when
            you&apos;re ready.
          </p>
        </div>
      </header>

      <form
        className="mb-5 grid gap-3 rounded-3xl border border-ink/12 bg-white/80 p-4"
        onSubmit={(e) => {
          e.preventDefault();
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
        }}
      >
        <div className="grid gap-3 sm:grid-cols-[1.3fr_1fr_1fr]">
          <label className="grid gap-1 text-xs font-medium text-muted">
            Business or service
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Haircut, massage, nails…"
              className="rounded-xl border border-ink/15 px-3 py-2.5 text-sm text-ink"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted">
            Location
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Toronto"
              className="rounded-xl border border-ink/15 px-3 py-2.5 text-sm text-ink"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted">
            Business type
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-xl border border-ink/15 px-3 py-2.5 text-sm text-ink"
            >
              <option value="">All types</option>
              {BUSINESS_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_0.8fr_1fr_auto]">
          <label className="grid gap-1 text-xs font-medium text-muted">
            Available on
            <input
              type="date"
              min={localToday()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-ink/15 px-3 py-2.5 text-sm text-ink"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted">
            Max price
            <select
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="rounded-xl border border-ink/15 px-3 py-2.5 text-sm text-ink"
            >
              <option value="">Any price</option>
              <option value="25">Up to $25</option>
              <option value="50">Up to $50</option>
              <option value="75">Up to $75</option>
              <option value="100">Up to $100</option>
              <option value="150">Up to $150</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-xl border border-ink/15 px-3 py-2.5 text-sm text-ink"
            >
              <option value="name">Business name</option>
              <option value="price">Lowest price</option>
              <option value="availability" disabled={!date}>
                Earliest availability
              </option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={busy}
              className="btn-solid w-full rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              {busy ? "Searching…" : "Search"}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={rewardsOnly}
              onChange={(e) => setRewardsOnly(e.target.checked)}
              className="h-4 w-4 accent-[#8d4f59]"
            />
            Rewards and offers only
          </label>
          {(q || city || type || date || maxPrice || rewardsOnly || sort !== "name") ? (
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
                setApplied({ ...EMPTY_FILTERS, requestId: Date.now() });
              }}
              className="text-sm font-medium text-cocoa underline-offset-2 hover:underline"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </form>

      {error ? <p className="mb-4 text-sm text-[#8a4a37]">{error}</p> : null}

      {!busy && !error ? (
        <p className="mb-4 text-sm text-muted">
          {businesses.length} {businesses.length === 1 ? "business" : "businesses"} found
          {applied.date ? ` with availability on ${applied.date}` : ""}.
        </p>
      ) : null}

      {!busy && businesses.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-ink/20 bg-white/60 p-8 text-center text-sm text-muted">
          No published businesses match yet.{" "}
          <Link href="/claim" className="font-semibold text-ink underline-offset-2 hover:underline">
            List your business
          </Link>
        </p>
      ) : null}

      <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {businesses.map((b) => {
          const bookHref = `/book/${encodeURIComponent(b.slug)}?from=explore`;
          const menuHref = `/explore/${encodeURIComponent(b.slug)}`;
          return (
          <article
            key={b.id}
            className="flex h-full flex-col overflow-hidden rounded-3xl border border-ink/12 bg-white/90 shadow-[0_12px_40px_rgba(0,0,0,0.06)]"
          >
            {/* Absolute img locks 16:10 so different cover files don't stretch the card. */}
            <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-[#f3eee8]">
              <Link
                href={menuHref}
                className="absolute inset-0"
                aria-label={`View ${b.name} menu`}
              >
              {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.coverUrl || "/display-promo.jpg"}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </Link>
              <div className="absolute right-3 top-3 z-10">
                <FavoriteBusinessButton salonId={b.id} compact />
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-1.5 p-4">
              <p className="text-[0.68rem] font-semibold tracking-[0.14em] text-cocoa uppercase">
                {b.businessTypeLabel}
              </p>
              <h2 className="line-clamp-2 font-[family-name:var(--font-display)] text-xl leading-tight text-ink">
                <Link href={menuHref} className="hover:underline">
                  {b.name}
                </Link>
              </h2>
              <p className="truncate text-sm text-muted">
                {[b.city, b.region].filter(Boolean).join(", ") ||
                  b.address ||
                  "Location coming soon"}
              </p>
              {b.description?.trim() ? (
                <p className="line-clamp-2 text-sm text-ink-soft">{b.description.trim()}</p>
              ) : null}
              <p className="text-xs text-muted">
                Hours {b.openHour}:00–{b.closeHour}:00
              </p>
              {b.matchedServices[0] ? (
                <p className="line-clamp-1 text-xs text-ink-soft">
                  {b.matchedServices[0].name} · from{" "}
                  <span className="font-semibold text-ink">
                    {formatCad(b.minPriceCents ?? b.matchedServices[0].priceCents)}
                  </span>
                </p>
              ) : null}
              {b.availability ? (
                <div className="mt-1 rounded-xl bg-[#e7f0e6] px-3 py-2 text-xs text-[#3f6b43]">
                  <span className="font-semibold">
                    Available {slotLabel(b.availability.earliestAt, b.timezone)}
                  </span>
                  <span> · {b.availability.serviceName}</span>
                </div>
              ) : null}
              {b.rewards?.hasRewards ? (
                <div
                  className="mt-1 flex items-center justify-between gap-3 rounded-xl border border-[#c9a87c]/35 bg-[linear-gradient(135deg,#fbf6ef,#f3ebe3)] px-3 py-2"
                  data-testid={`explore-rewards-${b.slug}`}
                >
                  <span className="text-[0.65rem] font-semibold tracking-[0.12em] text-cocoa uppercase">
                    Rewards available
                  </span>
                  <span className="shrink-0 text-xs text-ink-soft">
                    {b.rewards.loyaltyEnabled ? "Loyalty" : ""}
                    {b.rewards.loyaltyEnabled &&
                    b.rewards.promotions.length + b.rewards.morePromotions > 0
                      ? " · "
                      : ""}
                    {b.rewards.promotions.length + b.rewards.morePromotions > 0
                      ? `${b.rewards.promotions.length + b.rewards.morePromotions} offer${
                          b.rewards.promotions.length + b.rewards.morePromotions === 1 ? "" : "s"
                        }`
                      : ""}
                  </span>
                </div>
              ) : null}
              <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
                <Link
                  href={menuHref}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-ink/15 px-4 text-center text-sm font-semibold text-ink"
                  data-testid={`explore-menu-${b.slug}`}
                >
                  Menu
                </Link>
                <Link
                  href={bookHref}
                  className="btn-solid inline-flex h-11 items-center justify-center rounded-full px-4 text-center text-sm font-semibold"
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

      <p className="mt-10 text-center text-sm text-muted">
        Own a shop?{" "}
        <Link href="/claim" className="font-semibold text-ink underline-offset-2 hover:underline">
          Claim or create your business
        </Link>
      </p>
    </div>
  );
}
