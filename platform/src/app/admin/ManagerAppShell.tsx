"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminBottomNav } from "./AdminBottomNav";
import { AdminHeaderNav } from "./AdminHeaderNav";
import { ManagerThemeRoot } from "./ManagerThemeRoot";

export function ManagerAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const showChrome = !pathname.includes("/login");

  return (
    <ManagerThemeRoot showChrome={showChrome}>
      {showChrome ? (
        <header className="admin-header shrink-0 z-20">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:hidden">
            <Link
              href="/manager"
              className="font-[family-name:var(--font-display)] text-lg tracking-wide text-ink"
            >
              Farzana <span className="text-champagne">Hair Salon</span>
            </Link>
            <p className="text-xs font-semibold tracking-[0.16em] text-champagne uppercase">
              Manager
            </p>
          </div>
          <div className="mx-auto hidden max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4 md:flex">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] text-champagne uppercase">
                Dundas, Ontario
              </p>
              <Link
                href="/manager"
                className="font-[family-name:var(--font-display)] text-2xl text-ink"
              >
                Farzana <span className="text-champagne">Hair Salon</span>
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
