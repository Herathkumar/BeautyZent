"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function StylistBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const onBookings = pathname === "/stylist";
  const onSchedule = pathname.startsWith("/stylist/schedule");
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
      <Link href="/stylist/account" className={onAccount ? "active" : undefined}>
        <span aria-hidden>✎</span>
        Account
      </Link>
      <button
        type="button"
        onClick={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          router.push("/stylist/login");
          router.refresh();
        }}
      >
        <span aria-hidden>⎋</span>
        Log out
      </button>
    </nav>
  );
}
