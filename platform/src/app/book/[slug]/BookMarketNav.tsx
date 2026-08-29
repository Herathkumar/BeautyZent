"use client";

import { useLayoutEffect } from "react";
import { applyMarketplaceBookTheme } from "@/lib/marketplace-book-theme";

/**
 * Marketplace chrome on the booking app: back to Explore + cocoa light theme from Explore.
 */
export function BookMarketNav({
  salonName,
  fromExplore = false,
}: {
  salonName?: string | null;
  fromExplore?: boolean;
}) {
  useLayoutEffect(() => {
    if (fromExplore) applyMarketplaceBookTheme();
  }, [fromExplore]);

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--line)] bg-[color:var(--bg)]/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <a
          href="/explore"
          className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--line)] px-3 py-1.5 text-xs font-semibold text-[color:var(--ink-soft)] hover:border-[color:var(--champagne)] hover:text-[color:var(--champagne)]"
          data-testid="book-back-explore"
        >
          <span aria-hidden>←</span>
          Explore
        </a>

        <p className="max-w-[60%] truncate text-right text-xs font-medium text-[color:var(--muted)]">
          {salonName?.trim() || "Book"}
        </p>
      </div>
    </header>
  );
}
