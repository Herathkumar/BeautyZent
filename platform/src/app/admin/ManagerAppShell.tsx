"use client";

import { useLayoutEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  readStaffSalonBrand,
  writeSalonBrand,
  type SalonBrand,
} from "@/lib/salon-branding";
import { DEFAULT_MANAGER_THEME_ID, applySalonThemeId, normalizeThemeId } from "@/lib/salon-themes";
import { readManagerTheme } from "@/lib/manager-theme";
import { AdminBottomNav } from "./AdminBottomNav";
import { AdminHeaderNav } from "./AdminHeaderNav";
import { ManagerThemeRoot } from "./ManagerThemeRoot";

function applyManagerPack(salon: Pick<SalonBrand, "managerThemeId"> | null | undefined) {
  const pack = normalizeThemeId(salon?.managerThemeId, DEFAULT_MANAGER_THEME_ID);
  applySalonThemeId(pack, DEFAULT_MANAGER_THEME_ID);
  return pack;
}

export function ManagerAppShell({
  children,
  brandLink,
  brandLinkDesktop,
  initialBrand = null,
}: {
  children: React.ReactNode;
  /** Server-rendered salon name — do not recompute this text on the client. */
  brandLink: ReactNode;
  brandLinkDesktop: ReactNode;
  initialBrand?: SalonBrand | null;
}) {
  const pathname = usePathname() || "";
  const showChrome = !pathname.includes("/login");

  useLayoutEffect(() => {
    try {
      document.getElementById("fhsalon-boot-splash")?.remove();
    } catch {
      /* ignore */
    }

    const mode = readManagerTheme();
    document.documentElement.classList.toggle("theme-light", mode !== "dark");
    document.documentElement.classList.toggle("manager-shell--dark", mode === "dark");

    if (initialBrand?.name) {
      writeSalonBrand(initialBrand, { staff: true });
      applyManagerPack(initialBrand);
    } else if (!showChrome) {
      applyManagerPack(readStaffSalonBrand());
    }

    let cancelled = false;

    if (showChrome) {
      fetch("/api/admin/salon", {
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json", "Cache-Control": "no-cache" },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { salon?: SalonBrand } | null) => {
          if (cancelled || !data?.salon?.name) return;
          writeSalonBrand(data.salon, { staff: true });
          applyManagerPack(data.salon);
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [showChrome, initialBrand]);

  return (
    <ManagerThemeRoot>
      {showChrome ? (
        <header className="admin-header shrink-0 z-20">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:hidden">
            {brandLink}
            <p className="text-xs font-semibold tracking-[0.16em] text-champagne uppercase">
              Manager
            </p>
          </div>
          <div className="mx-auto hidden max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4 md:flex">
            {brandLinkDesktop}
            <AdminHeaderNav />
          </div>
        </header>
      ) : null}
      <div
        className={`admin-app-main mx-auto w-full max-w-5xl px-4 ${
          showChrome ? "pt-4 pb-6 md:px-6 md:py-8" : "py-8 md:px-6"
        }`}
      >
        {children}
      </div>
      {showChrome ? <AdminBottomNav /> : null}
    </ManagerThemeRoot>
  );
}
