"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const SALON_LINKS = [
  { href: "/admin/services", label: "Services", hint: "Menu & durations" },
  { href: "/admin/products", label: "Products", hint: "Retail & add-ons" },
  { href: "/admin/stylists", label: "Stylists", hint: "Team & schedules" },
] as const;

export function AdminBottomNav() {
  const pathname = usePathname();
  const [salonOpen, setSalonOpen] = useState(false);

  const onDashboard = pathname === "/admin";
  const onBookings =
    pathname.startsWith("/admin/appointments") || pathname.startsWith("/admin/book");
  const onSalon = SALON_LINKS.some((l) => pathname.startsWith(l.href));
  const onAccount = pathname.startsWith("/admin/account");

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

      <nav className="admin-bottom-nav" aria-label="Admin">
        <Link href="/admin" className={onDashboard ? "active" : undefined}>
          <span aria-hidden>▣</span>
          Dashboard
        </Link>
        <Link href="/admin/appointments" className={onBookings ? "active" : undefined}>
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
        <Link href="/admin/account" className={onAccount ? "active" : undefined}>
          <span aria-hidden>✎</span>
          Account
        </Link>
      </nav>
    </>
  );
}
