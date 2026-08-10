"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { StylistBottomNav } from "./StylistBottomNav";
import { StylistThemeRoot } from "./StylistThemeRoot";

export function StylistAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const showChrome = !pathname.includes("/login");

  return (
    <StylistThemeRoot showChrome={showChrome}>
      {showChrome ? (
        <header className="admin-header shrink-0 z-20 px-4 py-3">
          <div className="mx-auto flex max-w-lg items-center justify-between">
            <Link
              href="/stylist"
              className="font-[family-name:var(--font-display)] text-lg tracking-wide text-champagne"
            >
              FHSalon
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
