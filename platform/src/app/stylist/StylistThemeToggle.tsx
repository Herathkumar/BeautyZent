"use client";

import { useEffect, useState } from "react";
import { AppearanceToggle } from "@/components/AppearanceToggle";
import {
  DEFAULT_STYLIST_THEME_ID,
  applySalonThemeId,
  normalizeThemeId,
} from "@/lib/salon-themes";
import {
  STYLIST_THEME_EVENT,
  STYLIST_THEME_KEY,
  readStylistTheme,
  setStylistTheme,
  type StylistTheme,
} from "@/lib/stylist-theme";

export function StylistThemeToggle() {
  const [theme, setTheme] = useState<StylistTheme>("dark");
  const [packId, setPackId] = useState<string | null>(null);

  useEffect(() => {
    setTheme(readStylistTheme());
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STYLIST_THEME_KEY) return;
      setTheme(e.newValue === "light" ? "light" : "dark");
    };
    const onLocal = (e: Event) => {
      const detail = (e as CustomEvent<StylistTheme>).detail;
      if (detail === "dark" || detail === "light") setTheme(detail);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(STYLIST_THEME_EVENT, onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(STYLIST_THEME_EVENT, onLocal);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stylist/me", {
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json", "Cache-Control": "no-cache" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (data: {
          stylist?: { salon?: { stylistThemeId?: string | null } };
        } | null) => {
          if (cancelled) return;
          const id = normalizeThemeId(
            data?.stylist?.salon?.stylistThemeId,
            DEFAULT_STYLIST_THEME_ID
          );
          setPackId(id);
          applySalonThemeId(id, DEFAULT_STYLIST_THEME_ID);
        }
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppearanceToggle
      cardClassName="admin-stat-card"
      testId="stylist-theme-toggle"
      optionTestIdPrefix="stylist-theme"
      ariaLabel="Stylist theme"
      fallbackThemeId={DEFAULT_STYLIST_THEME_ID}
      packId={packId}
      value={theme}
      onChange={setStylistTheme}
    />
  );
}
