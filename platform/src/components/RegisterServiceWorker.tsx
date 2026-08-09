"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Registers the app-shell service worker and refreshes RSC data after a
 * stale-while-revalidate HTML hit so reopen feels instant but data stays fresh.
 */
export function RegisterServiceWorker() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/fhsalon-sw.js", {
          scope: "/",
        });
        if (cancelled) return;

        // Warm the current route into the nav cache after a successful paint.
        if (navigator.serviceWorker.controller || reg.active) {
          const path = window.location.pathname + window.location.search;
          void fetch(path, { credentials: "same-origin" }).catch(() => {});
        }

        // If this document came from cache, pull fresh server data.
        router.refresh();
      } catch {
        /* registration optional — app still works without SW */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
