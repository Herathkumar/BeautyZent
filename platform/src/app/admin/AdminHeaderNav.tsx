"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const SALON_LINKS = [
  { href: "/admin/services", label: "Services" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/stylists", label: "Stylists" },
] as const;

export function AdminHeaderNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const onSalon = SALON_LINKS.some((l) => pathname.startsWith(l.href));

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
    <nav className="admin-nav admin-header-nav hidden items-center gap-4 text-sm md:flex">
      <Link href="/admin" className={pathname === "/admin" ? "is-active" : undefined}>
        Dashboard
      </Link>
      <Link
        href="/admin/appointments"
        className={
          pathname.startsWith("/admin/appointments") || pathname.startsWith("/admin/book")
            ? "is-active"
            : undefined
        }
      >
        Bookings
      </Link>
      <div className="relative" ref={rootRef}>
        <button
          type="button"
          className={onSalon || open ? "is-active" : undefined}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          Salon ▾
        </button>
        {open ? (
          <div className="admin-salon-dropdown" role="menu">
            {SALON_LINKS.map((item) => (
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
        href="/admin/account"
        className={pathname.startsWith("/admin/account") ? "is-active" : undefined}
      >
        Account
      </Link>
    </nav>
  );
}
