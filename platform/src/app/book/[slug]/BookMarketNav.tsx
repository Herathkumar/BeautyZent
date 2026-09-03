"use client";

import { useLayoutEffect } from "react";
import { applyMarketplaceBookTheme } from "@/lib/marketplace-book-theme";

/**
 * Marketplace chrome on the booking app: back to Explore + cocoa luxury theme.
 */
export function BookMarketNav({
  fromExplore = false,
}: {
  fromExplore?: boolean;
}) {
  useLayoutEffect(() => {
    if (fromExplore) applyMarketplaceBookTheme();
  }, [fromExplore]);

  return (
    <header suppressHydrationWarning className="sticky top-0 z-40 bg-[#0c0b0a]">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <a
          href="/explore"
          className="book-chrome-btn"
          data-testid="book-back-explore"
          aria-label="Back to Explore"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
            <path
              d="M14.6 6.4 8.8 12l5.8 5.6"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
        <div className="min-w-0 text-center">
          <p className="font-[family-name:var(--font-display)] text-lg leading-none text-white">
            BeautyZent
          </p>
          <p className="mt-1 text-[10px] font-semibold tracking-[0.22em] text-champagne uppercase">
            Elevate your beauty
          </p>
        </div>
        <span className="h-[2.4rem] w-[2.4rem] shrink-0" aria-hidden />
      </div>
    </header>
  );
}
