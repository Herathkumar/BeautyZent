"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import {
  CUSTOMER_THEME_EVENT,
  applyCustomerDisplayTheme,
  readCustomerDisplayTheme,
  type CustomerDisplayTheme,
} from "@/lib/customer-display-theme";

/**
 * Stable SSR markup — light/dark modifiers land after mount so hydration
 * never disagrees with the server HTML (default light cream).
 */
export function CustomerThemeRoot({
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

    function sync(mode: CustomerDisplayTheme) {
      applyCustomerDisplayTheme(mode, root);
    }

    sync(readCustomerDisplayTheme());

    function onTheme(e: Event) {
      const detail = (e as CustomEvent<CustomerDisplayTheme>).detail;
      if (detail === "dark" || detail === "light") sync(detail);
    }
    window.addEventListener(CUSTOMER_THEME_EVENT, onTheme);
    return () => window.removeEventListener(CUSTOMER_THEME_EVENT, onTheme);
  }, []);

  return (
    <div
      ref={rootRef}
      data-customer-theme="light"
      className={`customer-board ${className}`.trim()}
      suppressHydrationWarning
    >
      {children}
    </div>
  );
}
