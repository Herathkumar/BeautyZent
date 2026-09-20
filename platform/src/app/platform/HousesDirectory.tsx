"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { businessTypeLabel } from "@/lib/marketplace";

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

type HouseStatus = "live" | "draft" | "paused" | "review";
type FilterId = "all" | HouseStatus;

export type PlatformHouse = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  listingStatus: string;
  businessType: string;
  openHour: number;
  closeHour: number;
  coverUrl: string | null;
  providers: number;
  services: number;
  bookings: number;
};

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "draft", label: "Draft" },
  { id: "paused", label: "Paused" },
  { id: "review", label: "In review" },
];

function categoryBadge(businessType: string) {
  const key = String(businessType || "").toUpperCase();
  if (CATEGORY_BADGE[key]) return CATEGORY_BADGE[key];
  return (businessTypeLabel(businessType) || key || "HOUSE").toUpperCase();
}

function houseStatus(house: PlatformHouse): HouseStatus {
  if (house.listingStatus === "DRAFT") return "review";
  if (!house.active) return "paused";
  if (house.listingStatus === "PUBLISHED") return "live";
  return "draft";
}

function statusLabel(status: HouseStatus) {
  if (status === "live") return "Live";
  if (status === "paused") return "Paused";
  if (status === "review") return "In review";
  return "Draft";
}

function formatHour(hour: number) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 8v4.25L14.5 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HousesDirectory({ houses }: { houses: PlatformHouse[] }) {
  const [filter, setFilter] = useState<FilterId>("all");

  const liveCount = houses.filter((h) => houseStatus(h) === "live").length;
  const pendingCount = houses.filter((h) => houseStatus(h) === "review").length;

  const visible = useMemo(() => {
    if (filter === "all") return houses;
    return houses.filter((h) => houseStatus(h) === filter);
  }, [filter, houses]);

  return (
    <div>
      <div className="platform-luxe__header">
        <div>
          <h1 className="platform-luxe__title">Houses</h1>
          <p className="platform-luxe__sub">
            {liveCount} live · {pendingCount} in review
          </p>
        </div>
        <div className="platform-luxe__header-actions">
          <Link href="/explore" className="platform-luxe__btn-ghost">
            View Explore
          </Link>
          <Link href="/platform/salons/new" className="platform-luxe__btn-gold">
            New house
          </Link>
        </div>
      </div>

      <div className="platform-luxe__filters" role="tablist" aria-label="Filter houses">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            className={`platform-luxe__chip${filter === item.id ? " is-selected" : ""}`}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {houses.length === 0 ? (
        <p className="platform-luxe__empty">
          No houses yet. Create one here or wait for a self-serve claim at /claim.
        </p>
      ) : (
        <div className="platform-luxe__grid">
          {visible.length === 0 ? (
            <p className="platform-luxe__empty">No houses match this filter.</p>
          ) : (
            visible.map((house) => {
              const status = houseStatus(house);
              return (
                <article key={house.id} className="platform-luxe__card">
                  <div className="platform-luxe__card-media">
                    {/* Explore uses the same placeholder when a house has no uploaded cover. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={house.coverUrl || "/display-promo.jpg"}
                      alt=""
                      className="platform-luxe__cover"
                    />
                    <span
                      className={`platform-luxe__status platform-luxe__status--${
                        status === "review" ? "review" : status
                      }`}
                    >
                      {statusLabel(status)}
                    </span>
                  </div>
                  <div className="platform-luxe__card-copy">
                    <p className="platform-luxe__category">
                      {categoryBadge(house.businessType)}
                    </p>
                    <h2 className="platform-luxe__name">{house.name}</h2>
                    <p className="platform-luxe__slug">/{house.slug}</p>
                    <p className="platform-luxe__hours">
                      <IconClock />
                      {formatHour(house.openHour)} – {formatHour(house.closeHour)}
                    </p>
                  </div>
                  <div className="platform-luxe__card-foot">
                    <div className="platform-luxe__card-actions">
                      <Link
                        href={`/platform/salons/${house.id}`}
                        className="platform-luxe__action-ghost"
                      >
                        Configure
                      </Link>
                      <Link
                        href={`/platform/salons/${house.id}/preview`}
                        className="platform-luxe__action-preview"
                      >
                        Preview
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
