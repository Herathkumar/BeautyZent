"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function StylistBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const onToday = pathname === "/stylist";
  const onAway = pathname.startsWith("/stylist/schedule");

  return (
    <nav className="stylist-bottom-nav" aria-label="Stylist">
      <Link href="/stylist" className={onToday ? "active" : undefined}>
        <span aria-hidden>◉</span>
        Today
      </Link>
      <Link href="/stylist/schedule" className={onAway ? "active" : undefined}>
        <span aria-hidden>◷</span>
        Away
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
