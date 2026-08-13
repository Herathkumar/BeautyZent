"use client";

import { useLayoutEffect, useRef } from "react";
import {
  STYLIST_THEME_EVENT,
  applyStylistTheme,
  readStylistTheme,
  type StylistTheme,
} from "@/lib/stylist-theme";

/**
 * Stable SSR markup — light/dark modifiers are applied after mount so hydration
 * never disagrees with the server HTML.
 */
export function StylistThemeRoot({ children }: { children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    function sync(mode: StylistTheme) {
      root.dataset.stylistTheme = mode;
      root.classList.toggle("stylist-theme--light", mode === "light");
      applyStylistTheme(mode);
    }

    sync(readStylistTheme());

    function onTheme(e: Event) {
      const detail = (e as CustomEvent<StylistTheme>).detail;
      if (detail === "dark" || detail === "light") sync(detail);
    }
    window.addEventListener(STYLIST_THEME_EVENT, onTheme);
    return () => window.removeEventListener(STYLIST_THEME_EVENT, onTheme);
  }, []);

  return (
    <div
      ref={rootRef}
      data-stylist-theme="dark"
      className="stylist-theme stylist-app-shell"
      suppressHydrationWarning
    >
      {children}
    </div>
  );
}
