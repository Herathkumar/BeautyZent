"use client";

import { useEffect, useState } from "react";
import {
  resolveSplashName,
  slugFromPathname,
  writeSalonBrand,
  type SalonBrand,
} from "@/lib/salon-branding";

const VARIANTS = {
  manager: {
    label: "Manager",
    className: "app-splash--manager",
  },
  stylist: {
    label: "Stylist App",
    className: "app-splash--stylist",
  },
  display: {
    label: "Salon Display",
    className: "app-splash--display",
  },
  book: {
    label: "Online Booking",
    className: "app-splash--book",
  },
} as const;

type Props = {
  variant: keyof typeof VARIANTS;
  /** Server-known salon name when available (book/display layouts). */
  brandName?: string | null;
  slug?: string | null;
  brandColor?: string | null;
  accentColor?: string | null;
};

export function AppSplash({ variant, brandName, slug, brandColor, accentColor }: Props) {
  const v = VARIANTS[variant];
  // Never read localStorage/window here — that is the SSR vs client name mismatch.
  const [name, setName] = useState(() => brandName?.trim() || "Salon");

  useEffect(() => {
    if (brandName?.trim()) {
      const s = slug || slugFromPathname(window.location.pathname);
      if (s) {
        writeSalonBrand({
          slug: s,
          name: brandName.trim(),
          brandColor,
          accentColor,
        });
      }
      setName(brandName.trim());
      return;
    }

    const resolvedSlug = slug || slugFromPathname(window.location.pathname);
    setName(resolveSplashName({ slug: resolvedSlug, pathname: window.location.pathname }));

    if (!resolvedSlug) return;

    let cancelled = false;
    fetch(`/api/public/${encodeURIComponent(resolvedSlug)}/brand`, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { salon?: SalonBrand } | null) => {
        if (cancelled || !data?.salon?.name) return;
        writeSalonBrand(data.salon);
        setName(data.salon.name);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [brandName, slug, brandColor, accentColor]);

  return (
    <div className={`app-splash ${v.className}`} role="status" aria-live="polite" aria-busy="true">
      <div className="app-splash-inner">
        <p className="app-splash-brand">{name}</p>
        <p className="app-splash-label">{v.label}</p>
        <div className="app-splash-spinner" aria-hidden />
      </div>
    </div>
  );
}
