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

  /* Match manager iPhone chrome: viewport-fit=cover + nav-black theme-color. */
  useEffect(() => {
    if (!mounted) return;
    let vp = document.querySelector('meta[name="viewport"]');
    if (!vp) {
      vp = document.createElement("meta");
      vp.setAttribute("name", "viewport");
      document.head.appendChild(vp);
    }
    const content = vp.getAttribute("content") || "";
    if (!/viewport-fit\s*=\s*cover/i.test(content)) {
      vp.setAttribute(
        "content",
        content
          ? `${content.replace(/,\s*$/, "")}, viewport-fit=cover`
          : "width=device-width, initial-scale=1, viewport-fit=cover"
      );
    }
    const theme = document.querySelector('meta[name="theme-color"]');
    theme?.setAttribute("content", "#0e1618");
    const status = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    status?.setAttribute("content", "default");
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
    <div className="stylist-theme">
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
    </div>
  );

  /* Portal to body so iOS doesn't trap position:fixed inside the app shell. */
  if (!mounted) return null;
  return createPortal(ui, document.body);
}
