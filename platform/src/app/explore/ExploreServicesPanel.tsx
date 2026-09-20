"use client";

import { useMemo, useState } from "react";

export type ExploreServiceRow = {
  id: string;
  name: string;
  category: string;
  durationMin: number;
  priceCents: number;
};

function formatPrice(cents: number) {
  const hasCents = cents % 100 !== 0;
  const amount = hasCents ? (cents / 100).toFixed(2) : String(Math.round(cents / 100));
  return `$${amount}`;
}

function groupLabel(key: string) {
  if (key === "ALL") return "All";
  if (key === "WOMEN") return "Women";
  if (key === "MEN") return "Men";
  return "Other";
}

export function ExploreServicesPanel({
  services,
  bookHref,
}: {
  services: ExploreServiceRow[];
  bookHref: string;
}) {
  const categoryTabs = useMemo(() => {
    const tabs: { key: string; items: ExploreServiceRow[] }[] = [
      { key: "WOMEN", items: services.filter((s) => s.category === "WOMEN") },
      { key: "MEN", items: services.filter((s) => s.category === "MEN") },
      {
        key: "OTHER",
        items: services.filter((s) => s.category !== "WOMEN" && s.category !== "MEN"),
      },
    ].filter((g) => g.items.length > 0);
    return [{ key: "ALL", items: services }, ...tabs];
  }, [services]);

  const [active, setActive] = useState("ALL");
  const rows = categoryTabs.find((t) => t.key === active)?.items ?? services;
  const chipTabs = categoryTabs.length > 1 ? categoryTabs : [];

  if (services.length === 0) {
    return (
      <p className="explore-menu__empty">
        No services listed yet. You can still <a href={bookHref}>open booking</a>.
      </p>
    );
  }

  return (
    <>
      {chipTabs.length > 1 ? (
        <div className="explore-menu__chips" role="tablist" aria-label="Service categories">
          {chipTabs.map((tab) => {
            const selected = tab.key === active;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={selected}
                className={`explore-menu__chip${selected ? " is-active" : ""}`}
                onClick={() => setActive(tab.key)}
              >
                {groupLabel(tab.key)}
              </button>
            );
          })}
        </div>
      ) : null}

      <ul className="explore-menu__list" aria-label={`${groupLabel(active)} services`}>
        {rows.map((s, index) => {
          const popular = index === 0;
          const meta = popular
            ? `${s.durationMin} min · Most booked`
            : `${s.durationMin} min`;
          return (
            <li key={s.id} className={`explore-menu__item${popular ? " is-popular" : ""}`}>
              <p className="explore-menu__item-name">{s.name}</p>
              <p className="explore-menu__item-meta">{meta}</p>
              <p className="explore-menu__item-price">from {formatPrice(s.priceCents)}</p>
              <a href={bookHref} className="explore-menu__item-reserve">
                Reserve <span aria-hidden>›</span>
              </a>
            </li>
          );
        })}
      </ul>
    </>
  );
}
