"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const MONEY_LINKS = [
  { href: "/manager/earnings", label: "Store Earnings", hint: "Revenue & activity" },
  { href: "/manager/pay", label: "Payroll", hint: "Pay, hours & leave" },
] as const;

const SALON_LINKS = [
  { href: "/manager/products", label: "Products", hint: "Retail inventory & photos" },
  { href: "/manager/services", label: "Services", hint: "Menu, prices & images" },
  { href: "/manager/stylists", label: "Stylists", hint: "Team & schedules" },
] as const;

type Sheet = "money" | "salon" | null;

/** True desktops only — phones (incl. landscape / “Request Desktop Website”) keep the bottom nav. */
function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px) and (hover: hover) and (pointer: fine)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return desktop;
}

export function AdminBottomNav() {
  const pathname = usePathname();
  const isDesktop = useIsDesktop();
  const [sheet, setSheet] = useState<Sheet>(null);

  useEffect(() => {
    setSheet(null);
  }, [pathname]);

  useEffect(() => {
    if (!sheet) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSheet(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet]);

  if (pathname.startsWith("/manager/login") || pathname.startsWith("/admin/login") || isDesktop) {
    return null;
  }

  const onDashboard = pathname === "/manager" || pathname === "/admin";
  const onBookings =
    pathname.startsWith("/manager/appointments") ||
    pathname.startsWith("/manager/book") ||
    pathname.startsWith("/manager/walk-in") ||
    pathname.startsWith("/admin/appointments") ||
    pathname.startsWith("/admin/book") ||
    pathname.startsWith("/admin/walk-in");
  const onSalon = SALON_LINKS.some(
    (l) => pathname.startsWith(l.href) || pathname.startsWith(l.href.replace("/manager", "/admin"))
  );
  const onMoney = MONEY_LINKS.some(
    (l) => pathname.startsWith(l.href) || pathname.startsWith(l.href.replace("/manager", "/admin"))
  );
  const onProfile =
    pathname.startsWith("/manager/account") || pathname.startsWith("/admin/account");

  return (
    <>
      {sheet === "salon" ? (
        <div className="admin-salon-sheet" role="dialog" aria-label="Salon menu">
          <button
            type="button"
            className="admin-salon-sheet-backdrop"
            aria-label="Close salon menu"
            onClick={() => setSheet(null)}
          />
          <div className="admin-salon-sheet-panel">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#7d6154] uppercase">
              Salon
            </p>
            <p className="mt-1 text-sm text-[#6b5b52]">Products, services, and stylists</p>
            <ul className="mt-4 grid gap-2">
              {SALON_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="admin-salon-sheet-link"
                    onClick={() => setSheet(null)}
                  >
                    <span className="font-semibold text-[#2b2521]">{item.label}</span>
                    <span className="text-sm text-[#6b5b52]">{item.hint}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {sheet === "money" ? (
        <div className="admin-salon-sheet" role="dialog" aria-label="Money menu">
          <button
            type="button"
            className="admin-salon-sheet-backdrop"
            aria-label="Close money menu"
            onClick={() => setSheet(null)}
          />
          <div className="admin-salon-sheet-panel">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#7d6154] uppercase">
              Money
            </p>
            <p className="mt-1 text-sm text-[#6b5b52]">Store earnings and payroll</p>
            <ul className="mt-4 grid gap-2">
              {MONEY_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="admin-salon-sheet-link"
                    onClick={() => setSheet(null)}
                  >
                    <span className="font-semibold text-[#2b2521]">{item.label}</span>
                    <span className="text-sm text-[#6b5b52]">{item.hint}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <nav className="admin-bottom-nav" aria-label="Manager">
        <Link href="/manager" className={onDashboard ? "active" : undefined}>
          <span aria-hidden>▣</span>
          Dashboard
        </Link>
        <Link href="/manager/appointments" className={onBookings ? "active" : undefined}>
          <span aria-hidden>◉</span>
          Bookings
        </Link>
        <button
          type="button"
          className={onSalon || sheet === "salon" ? "active" : undefined}
          aria-expanded={sheet === "salon"}
          data-testid="manager-nav-salon"
          onClick={() => setSheet((v) => (v === "salon" ? null : "salon"))}
        >
          <span aria-hidden>□</span>
          Salon
        </button>
        <button
          type="button"
          className={onMoney || sheet === "money" ? "active" : undefined}
          aria-expanded={sheet === "money"}
          onClick={() => setSheet((v) => (v === "money" ? null : "money"))}
        >
          <span aria-hidden>$</span>
          Money
        </button>
        <Link href="/manager/account" className={onProfile ? "active" : undefined}>
          <span aria-hidden>✎</span>
          Profile
        </Link>
      </nav>
    </>
  );
}
