"use client";

import { useLayoutEffect, useRef } from "react";
import {
  MANAGER_THEME_EVENT,
  applyManagerTheme,
  readManagerTheme,
  type ManagerTheme,
} from "@/lib/manager-theme";

/**
 * Stable SSR markup — dark class is toggled after mount to avoid hydration mismatches.
 */
export function ManagerThemeRoot({ children }: { children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    function sync(mode: ManagerTheme) {
      root.dataset.managerTheme = mode;
      root.classList.toggle("admin-theme--dark", mode === "dark");
      applyManagerTheme(mode);
    }

    sync(readManagerTheme());

    function onTheme(e: Event) {
      const detail = (e as CustomEvent<ManagerTheme>).detail;
      if (detail === "dark" || detail === "light") sync(detail);
    }
    window.addEventListener(MANAGER_THEME_EVENT, onTheme);
    return () => window.removeEventListener(MANAGER_THEME_EVENT, onTheme);
  }, []);

  return (
    <div
      ref={rootRef}
      data-manager-theme="light"
      className="admin-theme admin-app-shell"
      suppressHydrationWarning
    >
      {children}
    </div>
  );
}
