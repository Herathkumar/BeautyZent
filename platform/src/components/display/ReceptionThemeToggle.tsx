"use client";

import { useEffect, useState } from "react";
import {
  RECEPTION_THEME_EVENT,
  RECEPTION_THEME_KEY,
  readReceptionTheme,
  setReceptionTheme,
  type ReceptionTheme,
} from "@/lib/reception-theme";

export function ReceptionThemeToggle() {
  const [theme, setTheme] = useState<ReceptionTheme>("dark");

  useEffect(() => {
    setTheme(readReceptionTheme());
    const onStorage = (e: StorageEvent) => {
      if (e.key !== RECEPTION_THEME_KEY) return;
      setTheme(e.newValue === "light" ? "light" : "dark");
    };
    const onLocal = (e: Event) => {
      const detail = (e as CustomEvent<ReceptionTheme>).detail;
      if (detail === "dark" || detail === "light") setTheme(detail);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(RECEPTION_THEME_EVENT, onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(RECEPTION_THEME_EVENT, onLocal);
    };
  }, []);

  const option = (id: ReceptionTheme, label: string) => {
    const active = theme === id;
    return (
      <button
        type="button"
        aria-pressed={active}
        data-testid={`reception-theme-${id}`}
        onClick={() => setReceptionTheme(id)}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide ${
          active
            ? "bg-[var(--rx-accent)] text-white"
            : "text-[color:var(--rx-muted)] hover:text-[color:var(--rx-text)]"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      className="flex shrink-0 rounded-full border border-[color:var(--rx-line)] p-0.5"
      role="group"
      aria-label="Appearance"
      data-testid="reception-theme-toggle"
    >
      {option("light", "Light")}
      {option("dark", "Dark")}
    </div>
  );
}
