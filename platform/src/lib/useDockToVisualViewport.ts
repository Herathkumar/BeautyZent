"use client";

import { useEffect } from "react";

/**
 * Keep fixed bottom chrome flush with the visible screen on iOS.
 * After hard navigations / URL-bar changes, layout `bottom: 0` can sit above
 * the visual viewport and leave a white strip under the nav.
 */
export function useDockToVisualViewport(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const root = document.documentElement;
    const sync = () => {
      const vv = window.visualViewport;
      if (!vv) {
        root.style.setProperty("--app-nav-bottom", "0px");
        return;
      }
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty("--app-nav-bottom", `${Math.round(inset)}px`);
    };

    sync();
    window.visualViewport?.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);

    return () => {
      window.visualViewport?.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      root.style.removeProperty("--app-nav-bottom");
    };
  }, [enabled]);
}
