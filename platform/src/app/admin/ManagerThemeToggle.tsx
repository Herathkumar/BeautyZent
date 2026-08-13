"use client";

import { useEffect, useState } from "react";
import { AppearanceToggle } from "@/components/AppearanceToggle";
import {
  MANAGER_THEME_EVENT,
  MANAGER_THEME_KEY,
  readManagerTheme,
  setManagerTheme,
  type ManagerTheme,
} from "@/lib/manager-theme";
import {
  DEFAULT_MANAGER_THEME_ID,
  applySalonThemeId,
  normalizeThemeId,
} from "@/lib/salon-themes";

export function ManagerThemeToggle() {
  const [theme, setTheme] = useState<ManagerTheme>("light");
  const [packId, setPackId] = useState<string | null>(null);

  useEffect(() => {
    setTheme(readManagerTheme());
    const onStorage = (e: StorageEvent) => {
      if (e.key !== MANAGER_THEME_KEY) return;
      setTheme(e.newValue === "dark" ? "dark" : "light");
    };
    const onLocal = (e: Event) => {
      const detail = (e as CustomEvent<ManagerTheme>).detail;
      if (detail === "dark" || detail === "light") setTheme(detail);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(MANAGER_THEME_EVENT, onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(MANAGER_THEME_EVENT, onLocal);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/salon", {
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json", "Cache-Control": "no-cache" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { salon?: { managerThemeId?: string | null } } | null) => {
        if (cancelled) return;
        const id = normalizeThemeId(data?.salon?.managerThemeId, DEFAULT_MANAGER_THEME_ID);
        setPackId(id);
        applySalonThemeId(id, DEFAULT_MANAGER_THEME_ID);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppearanceToggle
      cardClassName="admin-stat-card"
      testId="manager-theme-toggle"
      optionTestIdPrefix="manager-theme"
      ariaLabel="Manager theme"
      fallbackThemeId={DEFAULT_MANAGER_THEME_ID}
      packId={packId}
      value={theme}
      onChange={setManagerTheme}
    />
  );
}
