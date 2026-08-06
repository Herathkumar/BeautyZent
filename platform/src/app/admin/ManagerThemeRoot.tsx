"use client";

import { useEffect, useState } from "react";
import {
  MANAGER_THEME_EVENT,
  MANAGER_THEME_KEY,
  applyManagerTheme,
  readManagerTheme,
  type ManagerTheme,
} from "@/lib/manager-theme";

export function ManagerThemeRoot({
  showChrome,
  children,
}: {
  showChrome: boolean;
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<ManagerTheme>("light");

  useEffect(() => {
    const next = readManagerTheme();
    setTheme(next);
    applyManagerTheme(next);

    const sync = (nextTheme: ManagerTheme) => {
      setTheme(nextTheme);
      applyManagerTheme(nextTheme);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== MANAGER_THEME_KEY) return;
      sync(e.newValue === "dark" ? "dark" : "light");
    };
    const onLocal = (e: Event) => {
      const detail = (e as CustomEvent<ManagerTheme>).detail;
      if (detail === "dark" || detail === "light") sync(detail);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(MANAGER_THEME_EVENT, onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(MANAGER_THEME_EVENT, onLocal);
    };
  }, []);

  return (
    <div
      className={`admin-theme ${theme === "dark" ? "admin-theme--dark" : ""} ${
        showChrome ? "admin-app-shell" : "min-h-screen"
      }`}
      data-manager-theme={theme}
    >
      {children}
    </div>
  );
}
