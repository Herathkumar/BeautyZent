"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const MONEY_LINKS = [
  { href: "/manager/earnings", label: "Store Earnings", hint: "Revenue & activity" },
  { href: "/manager/pay", label: "Payroll", hint: "Pay, hours & leave" },
] as const;

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
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
  const [moneyOpen, setMoneyOpen] = useState(false);

  useEffect(() => {
    setMoneyOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moneyOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMoneyOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moneyOpen]);

  if (pathname.startsWith("/manager/login") || pathname.startsWith("/admin/login") || isDesktop) {
    return null;
  }

  const onDashboard = pathname === "/manager" || pathname === "/admin";
  const onBookings =
    pathname.startsWith("/manager/appointments") ||
    pathname.startsWith("/manager/book") ||
    pathname.startsWith("/manager/walk-in") ||
    pathname.startsWith("/manager/display") ||
    pathname.startsWith("/admin/appointments") ||
    pathname.startsWith("/admin/book") ||
    pathname.startsWith("/admin/walk-in") ||
    pathname.startsWith("/admin/display");
  const onProducts =
    pathname.startsWith("/manager/products") ||
    pathname.startsWith("/manager/services") ||
    pathname.startsWith("/admin/products") ||
    pathname.startsWith("/admin/services");
  const onMoney = MONEY_LINKS.some(
    (l) => pathname.startsWith(l.href) || pathname.startsWith(l.href.replace("/manager", "/admin"))
  );
  const onProfile =
    pathname.startsWith("/manager/account") || pathname.startsWith("/admin/account");

  return (
    <>
      {moneyOpen ? (
        <div className="admin-salon-sheet" role="dialog" aria-label="Money menu">
          <button
            type="button"
            className="admin-salon-sheet-backdrop"
            aria-label="Close money menu"
            onClick={() => setMoneyOpen(false)}
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
                    onClick={() => setMoneyOpen(false)}
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
        <Link
          href="/manager/products"
          className={onProducts ? "active" : undefined}
          data-testid="manager-nav-products"
        >
          <span aria-hidden>□</span>
          Products
        </Link>
        <button
          type="button"
          className={onMoney || moneyOpen ? "active" : undefined}
          aria-expanded={moneyOpen}
          onClick={() => setMoneyOpen((v) => !v)}
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
