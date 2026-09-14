"use client";

import { useEffect, type ReactNode } from "react";
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
  // Legacy gold "zent" pack briefly became the stylist default; map it back to seaglass.
  const raw = salon?.stylistThemeId === "zent" ? DEFAULT_STYLIST_THEME_ID : salon?.stylistThemeId;
  const pack = normalizeThemeId(raw, DEFAULT_STYLIST_THEME_ID);
  applySalonThemeId(pack, DEFAULT_STYLIST_THEME_ID);
  return pack;
}

export function StylistAppShell({
  children,
  brandLink,
  initialBrand = null,
}: {
  children: React.ReactNode;
  /** Server-rendered salon name — do not recompute this text on the client. */
  brandLink: ReactNode;
  initialBrand?: SalonBrand | null;
}) {
  const pathname = usePathname() || "";
  const showChrome = !pathname.includes("/login");

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
    } else if (!showChrome) {
      applyStylistPack(readStaffSalonBrand());
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
          }
        )
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [showChrome, initialBrand]);

  const hideChromeHeader =
    pathname === "/stylist" || pathname.startsWith("/stylist/book");

  return (
    <StylistThemeRoot>
      {showChrome && !hideChromeHeader ? (
        <header className="admin-header shrink-0 z-20 px-4 py-3">
          <div className="mx-auto flex max-w-lg items-center justify-between">
            {brandLink}
            <p className="text-xs text-muted">Stylist App · no install</p>
          </div>
        </header>
      ) : null}
      <div
        className={`stylist-app-main mx-auto w-full max-w-lg px-4 ${
          showChrome ? (hideChromeHeader ? "pt-2 pb-6" : "pt-4 pb-6") : "py-8"
        }`}
      >
        {children}
      </div>
      {showChrome ? <StylistBottomNav /> : null}
    </StylistThemeRoot>
  );
}
