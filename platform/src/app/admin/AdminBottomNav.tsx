"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const SALON_LINKS = [
  { href: "/manager/working", label: "Who's working", hint: "Floor roster by day" },
  { href: "/manager/services", label: "Services", hint: "Menu & durations" },
  { href: "/manager/products", label: "Products", hint: "Retail & add-ons" },
  { href: "/manager/stylists", label: "Stylists", hint: "Team & schedules" },
  { href: "/manager/earnings", label: "Store Earnings", hint: "Revenue & activity" },
  { href: "/manager/pay", label: "Pay & hours", hint: "Payroll & leave approval" },
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
  const [salonOpen, setSalonOpen] = useState(false);

  useEffect(() => {
    setSalonOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!salonOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSalonOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [salonOpen]);

  if (pathname.startsWith("/manager/login") || pathname.startsWith("/admin/login") || isDesktop) {
    return null;
  }

  const onDashboard = pathname === "/manager" || pathname === "/admin";
  const onBookings =
    pathname.startsWith("/manager/appointments") ||
    pathname.startsWith("/manager/book") ||
    pathname.startsWith("/admin/appointments") ||
    pathname.startsWith("/admin/book");
  const onSalon = SALON_LINKS.some(
    (l) => pathname.startsWith(l.href) || pathname.startsWith(l.href.replace("/manager", "/admin"))
  );
  const onAccount =
    pathname.startsWith("/manager/account") || pathname.startsWith("/admin/account");

  return (
    <>
      {salonOpen ? (
        <div className="admin-salon-sheet" role="dialog" aria-label="Salon menu">
          <button
            type="button"
            className="admin-salon-sheet-backdrop"
            aria-label="Close salon menu"
            onClick={() => setSalonOpen(false)}
          />
          <div className="admin-salon-sheet-panel">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#c9a87c] uppercase">
              Salon
            </p>
            <p className="mt-1 text-sm text-[#d4c4b0]">Services, products, and team</p>
            <ul className="mt-4 grid gap-2">
              {SALON_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="admin-salon-sheet-link"
                    onClick={() => setSalonOpen(false)}
                  >
                    <span className="font-semibold text-[#fffaf6]">{item.label}</span>
                    <span className="text-sm text-[#d4c4b0]">{item.hint}</span>
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
          className={onSalon || salonOpen ? "active" : undefined}
          aria-expanded={salonOpen}
          onClick={() => setSalonOpen((v) => !v)}
        >
          <span aria-hidden>◫</span>
          Salon
        </button>
        <Link href="/manager/account" className={onAccount ? "active" : undefined}>
          <span aria-hidden>✎</span>
          Account
        </Link>
      </nav>
    </>
  );
}
