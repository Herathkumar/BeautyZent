"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  readStaffSalonBrand,
  writeSalonBrand,
  type SalonBrand,
} from "@/lib/salon-branding";
import { DEFAULT_STYLIST_THEME_ID, applySalonThemeId, normalizeThemeId } from "@/lib/salon-themes";
import { readStylistTheme } from "@/lib/stylist-theme";
import { StylistBottomNav } from "./StylistBottomNav";
import { StylistThemeRoot } from "./StylistThemeRoot";

function applyStylistPack(salon: Pick<SalonBrand, "stylistThemeId"> | null | undefined) {
  const pack = normalizeThemeId(salon?.stylistThemeId, DEFAULT_STYLIST_THEME_ID);
  applySalonThemeId(pack, DEFAULT_STYLIST_THEME_ID);
  return pack;
}

export function StylistAppShell({
  children,
  initialBrand = null,
}: {
  children: React.ReactNode;
  initialBrand?: SalonBrand | null;
}) {
  const pathname = usePathname() || "";
  const showChrome = !pathname.includes("/login");
  const [salonName, setSalonName] = useState(
    () => initialBrand?.name?.trim() || "Salon"
  );

  useEffect(() => {
    try {
      document.getElementById("fhsalon-boot-splash")?.remove();
    } catch {
      /* ignore */
    }

    const mode = readStylistTheme();
    document.documentElement.classList.toggle("theme-light", mode === "light");
    document.documentElement.classList.toggle("stylist-shell--light", mode === "light");

    if (initialBrand?.name) {
      writeSalonBrand(initialBrand, { staff: true });
      applyStylistPack(initialBrand);
      setSalonName(initialBrand.name.trim());
    } else if (!showChrome) {
      const cached = readStaffSalonBrand();
      if (cached?.name) setSalonName(cached.name.trim());
      applyStylistPack(cached);
    }

    let cancelled = false;

    if (showChrome) {
      fetch("/api/stylist/me", {
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json", "Cache-Control": "no-cache" },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then(
          (data: {
            stylist?: { salon?: SalonBrand & { phone?: string | null } };
          } | null) => {
            if (cancelled || !data?.stylist?.salon?.name) return;
            const salon = data.stylist.salon;
            writeSalonBrand(salon, { staff: true });
            applyStylistPack(salon);
            setSalonName(salon.name);
          }
        )
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [showChrome, initialBrand]);

  return (
    <StylistThemeRoot>
      {showChrome ? (
        <header className="admin-header shrink-0 z-20 px-4 py-3">
          <div className="mx-auto flex max-w-lg items-center justify-between">
            <Link
              href="/stylist"
              className="font-[family-name:var(--font-display)] text-lg tracking-wide text-champagne"
            >
              {salonName}
            </Link>
            <p className="text-xs text-muted">Stylist App · no install</p>
          </div>
        </header>
      ) : null}
      <div
        className={`stylist-app-main mx-auto w-full max-w-lg px-4 ${
          showChrome ? "pt-4 pb-6" : "py-8"
        }`}
      >
        {children}
      </div>
      {showChrome ? <StylistBottomNav /> : null}
    </StylistThemeRoot>
  );
}
