"use client";

import { useLayoutEffect } from "react";
import { writeSalonBrand, type SalonBrand } from "@/lib/salon-branding";
import {
  applyMarketplaceBookTheme,
  MARKETPLACE_BOOK_THEME_ID,
} from "@/lib/marketplace-book-theme";
import { applySalonThemeId } from "@/lib/salon-themes";

type Props = {
  /** Pack for this shell (booking / manager / stylist). */
  themeId: string | null | undefined;
  fallbackThemeId: string;
  /** Optional brand cache write so the next cold start paints correctly. */
  brand?: SalonBrand | null;
  /** When set, re-fetch brand so a platform theme change is picked up without a full rebuild. */
  slug?: string | null;
  /** Which pack field to apply when refreshing from the brand API. */
  themeField?: "bookingThemeId" | "managerThemeId" | "stylistThemeId";
  /** Persist as the staff-session salon so booking visits cannot overwrite manager/stylist chrome. */
  staff?: boolean;
};

/**
 * Ensures the salon theme pack is painted on `<html>` after React mounts
 * (and whenever the server sends a new theme id).
 */
export function SalonThemeSync({
  themeId,
  fallbackThemeId,
  brand,
  slug,
  themeField = "bookingThemeId",
  staff = false,
}: Props) {
  const brandSlug = brand?.slug ?? slug ?? "";
  const name = brand?.name ?? "";
  const bookingThemeId = brand?.bookingThemeId ?? null;
  const managerThemeId = brand?.managerThemeId ?? null;
  const stylistThemeId = brand?.stylistThemeId ?? null;
  const brandColor = brand?.brandColor ?? null;
  const accentColor = brand?.accentColor ?? null;

  useLayoutEffect(() => {
    // Stylist app is always sea-glass — never re-apply a gold/cocoa pack from brand cache/API.
    const resolvedThemeId =
      themeField === "stylistThemeId" ? fallbackThemeId : themeId;

    if (themeField === "bookingThemeId") {
      applyMarketplaceBookTheme();
    } else {
      applySalonThemeId(resolvedThemeId, fallbackThemeId);
    }
    if (brandSlug && name) {
      writeSalonBrand(
        {
          slug: brandSlug,
          name,
          brandColor,
          accentColor,
          bookingThemeId:
            themeField === "bookingThemeId" ? MARKETPLACE_BOOK_THEME_ID : bookingThemeId,
          managerThemeId,
          stylistThemeId:
            themeField === "stylistThemeId" ? fallbackThemeId : stylistThemeId,
        },
        { staff }
      );
    }

    if (!brandSlug) return;

    let cancelled = false;
    fetch(`/api/public/${encodeURIComponent(brandSlug)}/brand?_=${Date.now()}`, {
      credentials: "same-origin",
      headers: { Accept: "application/json", "Cache-Control": "no-cache" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { salon?: SalonBrand } | null) => {
        if (cancelled || !data?.salon) return;
        const salonForCache =
          themeField === "bookingThemeId"
            ? { ...data.salon, bookingThemeId: MARKETPLACE_BOOK_THEME_ID }
            : themeField === "stylistThemeId"
              ? { ...data.salon, stylistThemeId: fallbackThemeId }
              : data.salon;
        writeSalonBrand(salonForCache, { staff });
        if (themeField === "bookingThemeId") {
          applyMarketplaceBookTheme();
          return;
        }
        if (themeField === "stylistThemeId") {
          applySalonThemeId(fallbackThemeId, fallbackThemeId);
          return;
        }
        const nextId = data.salon[themeField] ?? themeId;
        applySalonThemeId(nextId, fallbackThemeId);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [
    themeId,
    fallbackThemeId,
    brandSlug,
    name,
    brandColor,
    accentColor,
    bookingThemeId,
    managerThemeId,
    stylistThemeId,
    themeField,
    staff,
  ]);

  return null;
}
