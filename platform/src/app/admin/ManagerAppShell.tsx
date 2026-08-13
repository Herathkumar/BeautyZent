"use client";

import Link from "next/link";
import { useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  locationEyebrow,
  readStaffSalonBrand,
  splitBrandName,
  writeSalonBrand,
  type SalonBrand,
} from "@/lib/salon-branding";
import { DEFAULT_MANAGER_THEME_ID, applySalonThemeId, normalizeThemeId } from "@/lib/salon-themes";
import { readManagerTheme } from "@/lib/manager-theme";
import { AdminBottomNav } from "./AdminBottomNav";
import { AdminHeaderNav } from "./AdminHeaderNav";
import { ManagerThemeRoot } from "./ManagerThemeRoot";

function BrandMark({ name, className }: { name: string; className?: string }) {
  const { lead, rest } = splitBrandName(name);
  return (
    <span className={className}>
      {lead}
      {rest ? (
        <>
          {" "}
          <span className="text-champagne">{rest}</span>
        </>
      ) : null}
    </span>
  );
}

function applyManagerPack(salon: Pick<SalonBrand, "managerThemeId"> | null | undefined) {
  const pack = normalizeThemeId(salon?.managerThemeId, DEFAULT_MANAGER_THEME_ID);
  applySalonThemeId(pack, DEFAULT_MANAGER_THEME_ID);
  return pack;
}

export function ManagerAppShell({
  children,
  initialBrand = null,
}: {
  children: React.ReactNode;
  initialBrand?: SalonBrand | null;
}) {
  const pathname = usePathname() || "";
  const showChrome = !pathname.includes("/login");
  const [salon, setSalon] = useState<SalonBrand | null>(initialBrand);

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
      setSalon(initialBrand);
    } else if (!showChrome) {
      const cached = readStaffSalonBrand();
      if (cached?.name) setSalon(cached);
      applyManagerPack(cached);
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
          setSalon(data.salon);
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [showChrome, initialBrand]);

  const brandName = salon?.name?.trim() || "Salon";
  const location = locationEyebrow(salon?.address);

  return (
    <ManagerThemeRoot>
      {showChrome ? (
        <header className="admin-header shrink-0 z-20">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:hidden">
            <Link
              href="/manager"
              className="font-[family-name:var(--font-display)] text-lg tracking-wide text-ink"
            >
              <BrandMark name={brandName} />
            </Link>
            <p className="text-xs font-semibold tracking-[0.16em] text-champagne uppercase">
              Manager
            </p>
          </div>
          <div className="mx-auto hidden max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4 md:flex">
            <div>
              {location ? (
                <p className="text-[11px] font-semibold tracking-[0.2em] text-champagne uppercase">
                  {location}
                </p>
              ) : null}
              <Link
                href="/manager"
                className="font-[family-name:var(--font-display)] text-2xl text-ink"
              >
                <BrandMark name={brandName} />
              </Link>
            </div>
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
