"use client";

import { useEffect, useState } from "react";
import {
  MANAGER_THEME_EVENT,
  MANAGER_THEME_KEY,
  readManagerTheme,
  setManagerTheme,
  type ManagerTheme,
} from "@/lib/manager-theme";

export function ManagerThemeToggle() {
  const [theme, setTheme] = useState<ManagerTheme>("light");

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

  return (
    <section
      className="admin-stat-card rounded-2xl p-5"
      data-testid="manager-theme-toggle"
    >
      <p className="text-xs font-semibold tracking-[0.16em] text-champagne uppercase">
        Appearance
      </p>
      <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-ink">
        Theme
      </h2>
      <p className="mt-1 text-sm text-muted">
        Switch between cream light and champagne dark for the Manager app on this device.
      </p>
      <div
        className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-[color:var(--line)] bg-[color:var(--color-cream)] p-1.5"
        role="group"
        aria-label="Manager theme"
      >
        {(
          [
            { id: "light", label: "Light", hint: "Cream" },
            { id: "dark", label: "Dark", hint: "Champagne" },
          ] as const
        ).map((opt) => {
          const active = theme === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={active}
              data-testid={`manager-theme-${opt.id}`}
              onClick={() => setManagerTheme(opt.id)}
              className={`rounded-xl px-3 py-3 text-left transition ${
                active
                  ? "bg-[color:var(--color-white)] text-ink shadow-[0_8px_20px_rgba(0,0,0,0.12)] ring-1 ring-[color:var(--champagne)]"
                  : "text-muted hover:text-ink"
              }`}
            >
              <span className="block text-sm font-semibold">{opt.label}</span>
              <span className="mt-0.5 block text-xs opacity-80">{opt.hint}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
