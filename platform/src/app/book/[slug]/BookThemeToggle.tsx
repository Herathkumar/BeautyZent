"use client";

import { useLayoutEffect, useState } from "react";
import { AppearanceToggle } from "@/components/AppearanceToggle";
import {
  BOOK_THEME_EVENT,
  BOOK_THEME_KEY,
  applyBookTheme,
  readBookThemePreference,
  setBookThemePreference,
  type BookThemePreference,
} from "@/lib/book-theme";
import {
  applyMarketplaceBookTheme,
  isMarketplaceBookSession,
  MARKETPLACE_BOOK_THEME_ID,
} from "@/lib/marketplace-book-theme";
import { DEFAULT_BOOKING_THEME_ID } from "@/lib/salon-themes";

/** Light / dark switcher for the client booking app. */
export function BookThemeToggle() {
  // null until mount — avoids painting dark over a saved light preference.
  const [theme, setTheme] = useState<BookThemePreference | null>(null);
  const [packId, setPackId] = useState<string | null>(null);

  useLayoutEffect(() => {
    const market = isMarketplaceBookSession();
    const current = market ? "light" : readBookThemePreference();
    if (market) applyMarketplaceBookTheme();
    else applyBookTheme(current);
    setTheme(current);
    setPackId(
      market
        ? MARKETPLACE_BOOK_THEME_ID
        : document.documentElement.getAttribute("data-salon-theme")
    );

    const onStorage = (e: StorageEvent) => {
      if (e.key !== BOOK_THEME_KEY) return;
      const next = e.newValue === "light" ? "light" : "dark";
      setTheme(next);
      applyBookTheme(next);
    };
    const onLocal = (e: Event) => {
      const detail = (e as CustomEvent<BookThemePreference>).detail;
      if (detail === "dark" || detail === "light") setTheme(detail);
    };
    const onPack = () => {
      setPackId(document.documentElement.getAttribute("data-salon-theme"));
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(BOOK_THEME_EVENT, onLocal);
    const observer = new MutationObserver(onPack);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-salon-theme"],
    });
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(BOOK_THEME_EVENT, onLocal);
      observer.disconnect();
    };
  }, []);

  if (!theme) return null;

  return (
    <AppearanceToggle
      cardClassName="book-card"
      testId="book-theme-toggle"
      optionTestIdPrefix="book-theme"
      ariaLabel="App theme"
      fallbackThemeId={
        isMarketplaceBookSession() ? MARKETPLACE_BOOK_THEME_ID : DEFAULT_BOOKING_THEME_ID
      }
      packId={packId}
      value={theme}
      onChange={(mode) => {
        setTheme(mode);
        setBookThemePreference(mode);
      }}
    />
  );
}

/** Applies marketplace cocoa (or saved light/dark) before paint. */
export function BookThemeBoot({ children }: { children: React.ReactNode }) {
  useLayoutEffect(() => {
    if (isMarketplaceBookSession()) {
      applyMarketplaceBookTheme();
    } else {
      applyBookTheme(readBookThemePreference());
    }
    const apply = () => {
      if (isMarketplaceBookSession()) applyMarketplaceBookTheme();
      else applyBookTheme(readBookThemePreference());
    };
    window.addEventListener(BOOK_THEME_EVENT, apply);
    return () => window.removeEventListener(BOOK_THEME_EVENT, apply);
  }, []);

  return <>{children}</>;
}
