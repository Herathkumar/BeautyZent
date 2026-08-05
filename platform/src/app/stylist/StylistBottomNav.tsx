"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export function StylistBottomNav() {
  const pathname = usePathname();
  const onJobs =
    pathname === "/stylist" ||
    pathname.startsWith("/stylist/display") ||
    pathname.startsWith("/stylist/book");
  const onSchedule = pathname.startsWith("/stylist/schedule");
  const onEarnings = pathname.startsWith("/stylist/earnings");
  const onProfile = pathname.startsWith("/stylist/account");
  const [unreadPayouts, setUnreadPayouts] = useState(0);

  const refreshBadge = useCallback(async () => {
    try {
      const res = await fetch("/api/stylist/earnings?badge=1");
      if (!res.ok) return;
      const json = await res.json();
      setUnreadPayouts(Number(json.unreadPayouts) || 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshBadge();
  }, [refreshBadge, pathname]);

  return (
    <nav className="stylist-bottom-nav" aria-label="Stylist">
      <Link href="/stylist" className={onJobs ? "active" : undefined}>
        <span aria-hidden>◉</span>
        My Jobs
      </Link>
      <Link href="/stylist/schedule" className={onSchedule ? "active" : undefined}>
        <span aria-hidden>◷</span>
        Schedule
      </Link>
      <Link href="/stylist/earnings" className={onEarnings ? "active" : undefined}>
        <span aria-hidden>$</span>
        Earnings
        {unreadPayouts > 0 && !onEarnings ? (
          <span className="stylist-nav-badge" aria-label={`${unreadPayouts} new payouts`}>
            {unreadPayouts > 9 ? "9+" : unreadPayouts}
          </span>
        ) : null}
      </Link>
      <Link href="/stylist/account" className={onProfile ? "active" : undefined}>
        <span aria-hidden>✎</span>
        Profile
      </Link>
    </nav>
  );
}
