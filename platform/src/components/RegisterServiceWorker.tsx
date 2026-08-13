"use client";

import { useEffect } from "react";

/**
 * Registers asset-only SW and clears any old HTML/nav caches that caused white screens.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    (async () => {
      try {
        const isLocal =
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1";
        // Dev + Turbopack: a cached /_next/static chunk hydrates against fresh HTML.
        if (process.env.NODE_ENV === "development" || isLocal) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
          return;
        }

        // Drop poisoned document caches from earlier SW versions (white screens).
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(
            keys
              .filter((k) => k !== "fhsalon-assets-v4")
              .map((k) => caches.delete(k))
          );
        }

        if (cancelled) return;
        await navigator.serviceWorker.register("/fhsalon-sw.js", { scope: "/" });
      } catch {
        /* optional */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
