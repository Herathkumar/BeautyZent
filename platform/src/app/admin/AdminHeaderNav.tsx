"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const MONEY_LINKS = [
  { href: "/manager/earnings", label: "Store Earnings" },
  { href: "/manager/pay", label: "Payroll" },
] as const;

const SALON_LINKS = [
  { href: "/manager/products", label: "Products" },
  { href: "/manager/services", label: "Services" },
  { href: "/manager/stylists", label: "Stylists" },
] as const;

type Menu = "money" | "salon" | null;

export function AdminHeaderNav() {
  const pathname = usePathname();
  const [menu, setMenu] = useState<Menu>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const onMoney = MONEY_LINKS.some((l) => pathname.startsWith(l.href));
  const onSalon = SALON_LINKS.some((l) => pathname.startsWith(l.href));

  useEffect(() => {
    setMenu(null);
  }, [pathname]);

  useEffect(() => {
    if (!menu) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setMenu(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenu(null);
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  return (
    <nav
      ref={rootRef}
      className="admin-nav admin-header-nav flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm"
    >
      <Link href="/manager" className={pathname === "/manager" ? "is-active" : undefined}>
        Dashboard
      </Link>
      <Link
        href="/manager/appointments"
        className={
          pathname.startsWith("/manager/appointments") ||
          pathname.startsWith("/manager/book") ||
          pathname.startsWith("/manager/walk-in")
            ? "is-active"
            : undefined
        }
      >
        Bookings
      </Link>
      <div className="relative">
        <button
          type="button"
          className={onSalon || menu === "salon" ? "is-active" : undefined}
          aria-expanded={menu === "salon"}
          onClick={() => setMenu((v) => (v === "salon" ? null : "salon"))}
        >
          Salon ▾
        </button>
        {menu === "salon" ? (
          <div className="admin-salon-dropdown" role="menu">
            {SALON_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setMenu(null)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
      <div className="relative">
        <button
          type="button"
          className={onMoney || menu === "money" ? "is-active" : undefined}
          aria-expanded={menu === "money"}
          onClick={() => setMenu((v) => (v === "money" ? null : "money"))}
        >
          Money ▾
        </button>
        {menu === "money" ? (
          <div className="admin-salon-dropdown" role="menu">
            {MONEY_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setMenu(null)}
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
