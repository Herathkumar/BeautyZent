"use client";

import { useEffect, useState } from "react";
import { AppSplash } from "./AppSplash";

type Variant = "manager" | "stylist" | "display" | "book";

/**
 * Shows once when the app is opened (per tab session).
 * Not tied to Next.js loading.tsx, so in-app menu navigation stays clean.
 */
export function AppOpenSplash({ variant }: { variant: Variant }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const key = `fhsalon-open-splash:${variant}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* private mode — still show once for this mount */
    }

    setVisible(true);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const holdMs = reduceMotion ? 80 : 420;
    const fadeMs = reduceMotion ? 0 : 220;

    const hold = window.setTimeout(() => {
      setLeaving(true);
      window.setTimeout(() => setVisible(false), fadeMs);
    }, holdMs);

    return () => window.clearTimeout(hold);
  }, [variant]);

  if (!visible) return null;

  return (
    <div className={leaving ? "app-splash-host is-leaving" : "app-splash-host"}>
      <AppSplash variant={variant} />
    </div>
  );
}
