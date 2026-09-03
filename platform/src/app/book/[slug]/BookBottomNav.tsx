"use client";

import type { ReactNode } from "react";

export type BookTabKey = "book" | "visits" | "lookbook" | "rewards" | "profile";

function NavIconHome({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M5 10.5 12 5l7 5.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 10.5V19h4v-4.5h2V19h4V10.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NavIconBookings({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <rect x="4.25" y="6" width="12" height="12.5" rx="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4.25 9.75h12M8 3.75v3M13.5 3.75v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="17.75" cy="16.25" r="3.75" stroke="currentColor" strokeWidth="1.15" />
      <path d="M17.75 14.6v1.65l1.1.75" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function NavIconWallet({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M4.75 9.25h12.75a1.75 1.75 0 0 1 1.75 1.75v5.5a1.75 1.75 0 0 1-1.75 1.75H4.75a1.75 1.75 0 0 1-1.75-1.75v-5.5a1.75 1.75 0 0 1 1.75-1.75Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path d="M4.75 12h14.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="16.25" cy="14.25" r="0.95" fill="currentColor" />
      <path
        d="m17.35 5.15.95.95-1.85 1.85-.75-.75 1.65-2.05Z"
        fill="currentColor"
      />
      <path
        d="M16.95 5.55l.45.45M17.4 5.1l.45.45"
        stroke="currentColor"
        strokeWidth="0.55"
        strokeLinecap="round"
      />
    </svg>
  );
}

function NavIconProfile({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <circle cx="12" cy="8.5" r="3.5" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M5.5 20a6.5 6.5 0 0 1 13 0"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

const SIDE_TABS: Array<{ key: BookTabKey; label: string }> = [
  { key: "book", label: "Home" },
  { key: "visits", label: "Bookings" },
  { key: "rewards", label: "Wallet" },
  { key: "profile", label: "Profile" },
];

const SIDE_ICONS: Record<Exclude<BookTabKey, "lookbook">, ReactNode> = {
  book: <NavIconHome className="book-bottom-nav__svg" />,
  visits: <NavIconBookings className="book-bottom-nav__svg" />,
  rewards: <NavIconWallet className="book-bottom-nav__svg" />,
  profile: <NavIconProfile className="book-bottom-nav__svg" />,
};

const NAV_ICON_MARKS: Partial<Record<BookTabKey, string>> = {
  visits: "/brand/bookings-nav-icon.png?v=1",
  rewards: "/brand/wallet-nav-icon.png?v=1",
};

function SideNavItem({
  tabKey,
  label,
  isActive,
  count,
  onSelect,
}: {
  tabKey: Exclude<BookTabKey, "lookbook">;
  label: string;
  isActive: boolean;
  count: number;
  onSelect: (key: BookTabKey) => void;
}) {
  const markSrc = NAV_ICON_MARKS[tabKey];

  return (
    <button
      type="button"
      onClick={() => onSelect(tabKey)}
      aria-current={isActive ? "page" : undefined}
      data-testid={`book-nav-${tabKey}`}
      className={`book-bottom-nav__item ${isActive ? "is-active" : ""}`}
    >
      <span className="book-bottom-nav__icon">
        <span className="book-bottom-nav__icon-halo" aria-hidden />
        {markSrc ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={markSrc} alt="" className="book-bottom-nav__nav-mark" />
        ) : (
          SIDE_ICONS[tabKey]
        )}
        {count > 0 ? (
          <span className="book-bottom-nav__badge">{count > 9 ? "9+" : count}</span>
        ) : null}
      </span>
      <span className="book-bottom-nav__label font-[family-name:var(--font-display)]">{label}</span>
    </button>
  );
}

/**
 * Native-app style tab bar for the booking PWA. Tabs open the existing member
 * sheets rather than routing, so the wizard never loses its in-progress state.
 */
export function BookBottomNav({
  active,
  badge,
  onSelect,
}: {
  active: BookTabKey;
  badge?: Partial<Record<BookTabKey, number>>;
  onSelect: (key: BookTabKey) => void;
}) {
  const leftTabs = SIDE_TABS.slice(0, 2);
  const rightTabs = SIDE_TABS.slice(2);
  const beautyActive = active === "lookbook";

  return (
    <nav className="book-bottom-nav" aria-label="Booking sections">
      <div className="book-bottom-nav__edge" aria-hidden />
      <div className="book-bottom-nav__row">
        {leftTabs.map((tab) => (
          <SideNavItem
            key={tab.key}
            tabKey={tab.key}
            label={tab.label}
            isActive={active === tab.key}
            count={badge?.[tab.key] || 0}
            onSelect={onSelect}
          />
        ))}

        <button
          type="button"
          onClick={() => onSelect("lookbook")}
          aria-current={beautyActive ? "page" : undefined}
          data-testid="book-nav-lookbook"
          className={`book-bottom-nav__item book-bottom-nav__item--center ${
            beautyActive ? "is-active" : ""
          }`}
        >
          <span className="book-bottom-nav__center-mark">
            <span className="book-bottom-nav__icon-halo book-bottom-nav__icon-halo--center" aria-hidden />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/beautyai-nav-icon.png?v=5"
              alt=""
              className="book-bottom-nav__beauty-mark"
            />
          </span>
          <span className="book-bottom-nav__label book-bottom-nav__label--brand font-[family-name:var(--font-display)]">
            BeautyAI
          </span>
        </button>

        {rightTabs.map((tab) => (
          <SideNavItem
            key={tab.key}
            tabKey={tab.key}
            label={tab.label}
            isActive={active === tab.key}
            count={badge?.[tab.key] || 0}
            onSelect={onSelect}
          />
        ))}
      </div>
    </nav>
  );
}
