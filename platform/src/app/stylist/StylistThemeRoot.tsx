"use client";

import { useEffect, useState } from "react";
import {
  STYLIST_THEME_EVENT,
  STYLIST_THEME_KEY,
  applyStylistTheme,
  readStylistTheme,
  type StylistTheme,
} from "@/lib/stylist-theme";

export function StylistThemeRoot({
  showChrome,
  children,
}: {
  showChrome: boolean;
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<StylistTheme>("dark");

  useEffect(() => {
    const next = readStylistTheme();
    setTheme(next);
    applyStylistTheme(next);

    const sync = (nextTheme: StylistTheme) => {
      setTheme(nextTheme);
      applyStylistTheme(nextTheme);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STYLIST_THEME_KEY) return;
      sync(e.newValue === "light" ? "light" : "dark");
    };
    const onLocal = (e: Event) => {
      const detail = (e as CustomEvent<StylistTheme>).detail;
      if (detail === "dark" || detail === "light") sync(detail);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(STYLIST_THEME_EVENT, onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(STYLIST_THEME_EVENT, onLocal);
    };
  }, []);

  return (
    <div
      className={`stylist-theme ${theme === "light" ? "stylist-theme--light" : ""} ${
        showChrome ? "stylist-app-shell" : "min-h-screen"
      }`}
      data-stylist-theme={theme}
    >
      {children}
    </div>
  );
}
