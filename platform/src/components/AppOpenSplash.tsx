"use client";

import { useLayoutEffect, useState } from "react";
import { AppSplash } from "./AppSplash";
import { writeSalonBrand } from "@/lib/salon-branding";
import {
  applyMarketplaceBookTheme,
  isMarketplaceBookSession,
} from "@/lib/marketplace-book-theme";
import { applySalonThemeId, DEFAULT_BOOKING_THEME_ID, DEFAULT_MANAGER_THEME_ID, DEFAULT_STYLIST_THEME_ID } from "@/lib/salon-themes";

type Variant = "manager" | "stylist" | "display" | "book";

type Props = {
  variant: Variant;
  brandName?: string | null;
  slug?: string | null;
  brandColor?: string | null;
  accentColor?: string | null;
  /** Cached so the next cold start paints the salon's packs before React mounts. */
  themeIds?: {
    bookingThemeId?: string | null;
    managerThemeId?: string | null;
    stylistThemeId?: string | null;
  } | null;
};

function clearBootSplash() {
  try {
    document.getElementById("fhsalon-boot-splash")?.remove();
  } catch {
    /* ignore */
  }
}

/**
 * Shows once when the app is opened (per tab session).
 * Cold start paint is covered by #fhsalon-boot-splash in root layout.
 * Splashes never capture pointer events.
 */
export function AppOpenSplash({
  variant,
  brandName,
  slug,
  brandColor,
  accentColor,
  themeIds,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useLayoutEffect(() => {
    if (brandName?.trim() && slug) {
      writeSalonBrand({
        slug,
        name: brandName.trim(),
        brandColor,
        accentColor,
        bookingThemeId: themeIds?.bookingThemeId ?? null,
        managerThemeId: themeIds?.managerThemeId ?? null,
        stylistThemeId: themeIds?.stylistThemeId ?? null,
      });
    }

    // Only paint when we know the pack — never fall back to defaults here or we
    // clobber a correct theme (manager splash has no themeIds and was resetting to cocoa).
    if (variant === "book" && isMarketplaceBookSession()) {
      applyMarketplaceBookTheme();
    } else if (variant === "book" && themeIds?.bookingThemeId) {
      applySalonThemeId(themeIds.bookingThemeId, DEFAULT_BOOKING_THEME_ID);
    } else if (variant === "manager" && themeIds?.managerThemeId) {
      applySalonThemeId(themeIds.managerThemeId, DEFAULT_MANAGER_THEME_ID);
    } else if (variant === "stylist" && themeIds?.stylistThemeId) {
      applySalonThemeId(themeIds.stylistThemeId, DEFAULT_STYLIST_THEME_ID);
    }

    const key = `fhsalon-open-splash:${variant}:${slug || "default"}`;
    let already = false;
    try {
      already = sessionStorage.getItem(key) === "1";
    } catch {
      /* private mode */
    }

    // Keep boot splash until our React splash (or dismiss) is ready — avoids a white gap.
    if (already) {
      clearBootSplash();
      return;
    }

    try {
      sessionStorage.setItem(key, "1");
    } catch {
      /* private mode — still show once for this mount */
    }

    setVisible(true);
    clearBootSplash();

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const holdMs = reduceMotion ? 80 : 520;
    const fadeMs = reduceMotion ? 0 : 220;
    let fadeTimer = 0;

    const hold = window.setTimeout(() => {
      setLeaving(true);
      fadeTimer = window.setTimeout(() => setVisible(false), fadeMs);
    }, holdMs);

    return () => {
      window.clearTimeout(hold);
      window.clearTimeout(fadeTimer);
      clearBootSplash();
    };
  }, [variant, brandName, slug, brandColor, accentColor, themeIds]);

  if (!visible) return null;

  return (
    <div className={leaving ? "app-splash-host is-leaving" : "app-splash-host"}>
      <AppSplash
        variant={variant}
        brandName={brandName}
        slug={slug}
        brandColor={brandColor}
        accentColor={accentColor}
      />
    </div>
  );
}
