"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function StylistBottomNav() {
  const pathname = usePathname();
  const onBookings = pathname === "/stylist";
  const onSchedule = pathname.startsWith("/stylist/schedule");
  const onEarnings = pathname.startsWith("/stylist/earnings");
  const onAccount = pathname.startsWith("/stylist/account");

  return (
    <nav className="stylist-bottom-nav" aria-label="Stylist">
      <Link href="/stylist" className={onBookings ? "active" : undefined}>
        <span aria-hidden>◉</span>
        My Bookings
      </Link>
      <Link href="/stylist/schedule" className={onSchedule ? "active" : undefined}>
        <span aria-hidden>◷</span>
        Schedule
      </Link>
      <Link href="/stylist/earnings" className={onEarnings ? "active" : undefined}>
        <span aria-hidden>$</span>
        Earnings
      </Link>
      <Link href="/stylist/account" className={onAccount ? "active" : undefined}>
        <span aria-hidden>✎</span>
        Account
      </Link>
    </nav>
  );
}
