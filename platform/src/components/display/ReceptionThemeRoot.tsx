"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import {
  RECEPTION_THEME_EVENT,
  applyReceptionTheme,
  readReceptionTheme,
  type ReceptionTheme,
} from "@/lib/reception-theme";

/**
 * Stable SSR markup — light/dark modifiers land after mount so hydration
 * never disagrees with the server HTML (default dark).
 */
export function ReceptionThemeRoot({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    function sync(mode: ReceptionTheme) {
      applyReceptionTheme(mode, root);
    }

    sync(readReceptionTheme());

    function onTheme(e: Event) {
      const detail = (e as CustomEvent<ReceptionTheme>).detail;
      if (detail === "dark" || detail === "light") sync(detail);
    }
    window.addEventListener(RECEPTION_THEME_EVENT, onTheme);
    return () => window.removeEventListener(RECEPTION_THEME_EVENT, onTheme);
  }, []);

  return (
    <div
      ref={rootRef}
      data-reception-theme="dark"
      className={`reception-board ${className}`.trim()}
      suppressHydrationWarning
    >
      {children}
    </div>
  );
}
