"use client";

import { useLayoutEffect } from "react";
import { applyMarketplaceBookTheme } from "@/lib/marketplace-book-theme";

/** Paints the locked cocoa gold luxury look before the first book paint. */
export function BookThemeBoot({ children }: { children: React.ReactNode }) {
  useLayoutEffect(() => {
    applyMarketplaceBookTheme();
  }, []);

  return <>{children}</>;
}
