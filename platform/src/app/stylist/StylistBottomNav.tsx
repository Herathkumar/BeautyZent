"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function StylistBottomNav() {
  const pathname = usePathname();
  const onJobs = pathname === "/stylist" || pathname.startsWith("/stylist/book");
  const onSchedule = pathname.startsWith("/stylist/schedule");
  const onEarnings = pathname.startsWith("/stylist/earnings");
  const onProfile = pathname.startsWith("/stylist/account");
  const [unreadPayouts, setUnreadPayouts] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* Keep iOS PWA chrome / under-nav paint nav-black (mint theme-color = white strip). */
  useEffect(() => {
    if (!mounted) return;
    const meta = document.querySelector('meta[name="theme-color"]');
    const prev = meta?.getAttribute("content") ?? null;
    meta?.setAttribute("content", "#0e1618");
    document.documentElement.style.backgroundColor = "#0e1618";
    document.body.style.backgroundColor = "#0e1618";
    return () => {
      if (meta && prev) meta.setAttribute("content", prev);
    };
  }, [mounted]);

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

  const ui = (
    <>
      <nav className="stylist-bottom-nav" aria-label="Stylist">
        {/* Hard <a> — Next <Link> soft-nav is unreliable in iOS Home Screen PWAs */}
        <a href="/stylist" className={onJobs ? "active" : undefined}>
          <span aria-hidden>◉</span>
          My Jobs
        </a>
        <a href="/stylist/schedule" className={onSchedule ? "active" : undefined}>
          <span aria-hidden>◷</span>
          Schedule
        </a>
        <a href="/stylist/earnings" className={onEarnings ? "active" : undefined}>
          <span aria-hidden>$</span>
          Earnings
          {unreadPayouts > 0 && !onEarnings ? (
            <span className="stylist-nav-badge" aria-label={`${unreadPayouts} new payouts`}>
              {unreadPayouts > 9 ? "9+" : unreadPayouts}
            </span>
          ) : null}
        </a>
        <a href="/stylist/account" className={onProfile ? "active" : undefined}>
          <span aria-hidden>✎</span>
          Profile
        </a>
      </nav>
      {/* Extra home-indicator paint — independent of env(safe-area) quirks */}
      <div className="stylist-bottom-nav-safe" aria-hidden />
    </>
  );

  /* Portal to body so iOS doesn't trap position:fixed inside the app shell. */
  if (!mounted) return null;
  return createPortal(ui, document.body);
}
