"use client";

export type BookTabKey = "book" | "visits" | "lookbook" | "rewards" | "profile";

const ICONS: Record<BookTabKey, React.ReactNode> = {
  book: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-5 w-5">
      <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  visits: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-5 w-5">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  lookbook: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-5 w-5">
      <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="9" cy="10" r="1.8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 17l4.5-4 3.5 3 3-2.5L20 17" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  rewards: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-5 w-5">
      <path
        d="M12 3.5l2.1 4.25 4.7.68-3.4 3.31.8 4.66L12 14.4l-4.2 2.2.8-4.66-3.4-3.31 4.7-.68L12 3.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-5 w-5">
      <circle cx="12" cy="8.5" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4.5 20a7.5 7.5 0 0115 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
};

const TABS: Array<{ key: BookTabKey; label: string }> = [
  { key: "book", label: "Home" },
  { key: "visits", label: "Bookings" },
  { key: "lookbook", label: "Look book" },
  { key: "rewards", label: "Wallet" },
  { key: "profile", label: "Profile" },
];

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
  return (
    <nav className="book-bottom-nav" aria-label="Booking sections">
      {TABS.map((tab) => {
        const count = badge?.[tab.key] || 0;
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onSelect(tab.key)}
            aria-current={isActive ? "page" : undefined}
            data-testid={`book-nav-${tab.key}`}
            className={`book-bottom-nav__item ${isActive ? "is-active" : ""}`}
          >
            <span className="book-bottom-nav__icon">
              {ICONS[tab.key]}
              {count > 0 ? (
                <span className="book-bottom-nav__badge">{count > 9 ? "9+" : count}</span>
              ) : null}
            </span>
            <span className="book-bottom-nav__label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
