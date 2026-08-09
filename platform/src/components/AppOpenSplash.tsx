"use client";

import { useLayoutEffect, useState } from "react";
import { AppSplash } from "./AppSplash";

type Variant = "manager" | "stylist" | "display" | "book";

function clearBootSplash() {
  try {
    document.getElementById("fhsalon-boot-splash")?.remove();
  } catch {
    /* ignore */
  }
}

/**
 * Shows once when the app is opened (per tab session).
 * Cold start paint is covered by #fhsalon-boot-splash in root layout.
 * Splashes never capture pointer events.
 */
export function AppOpenSplash({ variant }: { variant: Variant }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useLayoutEffect(() => {
    const key = `fhsalon-open-splash:${variant}`;
    let already = false;
    try {
      already = sessionStorage.getItem(key) === "1";
    } catch {
      /* private mode */
    }

    // Keep boot splash until our React splash (or dismiss) is ready — avoids a white gap.
    if (already) {
      clearBootSplash();
      return;
    }

    try {
      sessionStorage.setItem(key, "1");
    } catch {
      /* private mode — still show once for this mount */
    }

    setVisible(true);
    clearBootSplash();

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const holdMs = reduceMotion ? 80 : 520;
    const fadeMs = reduceMotion ? 0 : 220;
    let fadeTimer = 0;

    const hold = window.setTimeout(() => {
      setLeaving(true);
      fadeTimer = window.setTimeout(() => setVisible(false), fadeMs);
    }, holdMs);

    return () => {
      window.clearTimeout(hold);
      window.clearTimeout(fadeTimer);
      clearBootSplash();
    };
  }, [variant]);

  if (!visible) return null;

  return (
    <div className={leaving ? "app-splash-host is-leaving" : "app-splash-host"}>
      <AppSplash variant={variant} />
    </div>
  );
}
