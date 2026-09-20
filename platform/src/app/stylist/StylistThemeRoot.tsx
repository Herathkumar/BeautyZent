"use client";

import { useLayoutEffect, useRef } from "react";
import { applyStylistTheme } from "@/lib/stylist-theme";

/**
 * Cream / house-gold stylist shell — no light/dark switch.
 */
export function StylistThemeRoot({ children }: { children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    applyStylistTheme("light");
  }, []);

  return (
    <div
      ref={rootRef}
      data-stylist-theme="light"
      className="stylist-theme stylist-theme--light stylist-app-shell"
      suppressHydrationWarning
    >
      {children}
    </div>
  );
}
