"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const MONEY_LINKS = [
  { href: "/manager/earnings", label: "Store Earnings" },
  { href: "/manager/pay", label: "Payroll" },
] as const;

export function AdminHeaderNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const onMoney = MONEY_LINKS.some((l) => pathname.startsWith(l.href));

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <nav className="admin-nav admin-header-nav flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm">
      <Link href="/manager" className={pathname === "/manager" ? "is-active" : undefined}>
        Dashboard
      </Link>
      <Link
        href="/manager/appointments"
        className={
          pathname.startsWith("/manager/appointments") ||
          pathname.startsWith("/manager/book") ||
          pathname.startsWith("/manager/walk-in") ||
          pathname.startsWith("/manager/display")
            ? "is-active"
            : undefined
        }
      >
        Bookings
      </Link>
      <Link
        href="/manager/products"
        className={
          pathname.startsWith("/manager/products") || pathname.startsWith("/manager/services")
            ? "is-active"
            : undefined
        }
      >
        Products
      </Link>
      <div className="relative" ref={rootRef}>
        <button
          type="button"
          className={onMoney || open ? "is-active" : undefined}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          Money ▾
        </button>
        {open ? (
          <div className="admin-salon-dropdown" role="menu">
            {MONEY_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
      <Link
        href="/manager/account"
        className={pathname.startsWith("/manager/account") ? "is-active" : undefined}
      >
        Profile
      </Link>
    </nav>
  );
}
