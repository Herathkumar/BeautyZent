"use client";

import { useEffect, useState } from "react";
import {
  MANAGER_THEME_EVENT,
  MANAGER_THEME_KEY,
  readManagerTheme,
  setManagerTheme,
  type ManagerTheme,
} from "@/lib/manager-theme";

function ThemeSwatch({ mode }: { mode: ManagerTheme }) {
  if (mode === "light") {
    return (
      <span
        className="relative block h-14 w-full overflow-hidden rounded-xl border border-[#7d6154]/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
        style={{
          background:
            "linear-gradient(145deg, #fdf8f3 0%, #f3ebe3 55%, #ebe2d8 100%)",
        }}
        aria-hidden
      >
        <span className="absolute left-2.5 top-2.5 h-2 w-10 rounded-full bg-[#7d6154]/70" />
        <span className="absolute bottom-2.5 left-2.5 right-2.5 h-5 rounded-lg bg-white shadow-sm ring-1 ring-[#7d6154]/15" />
        <span className="absolute bottom-3.5 right-4 h-2 w-2 rounded-full bg-[#7d6154]" />
      </span>
    );
  }

  return (
    <span
      className="relative block h-14 w-full overflow-hidden rounded-xl border border-[#c9a87c]/35 shadow-[inset_0_1px_0_rgba(240,201,135,0.12)]"
      style={{
        background:
          "radial-gradient(80px 40px at 90% 0%, rgba(240,201,135,0.28), transparent 60%), linear-gradient(145deg, #261e19 0%, #1c1714 55%, #12100e 100%)",
      }}
      aria-hidden
    >
      <span className="absolute left-2.5 top-2.5 h-2 w-10 rounded-full bg-[#f0c987]/85" />
      <span className="absolute bottom-2.5 left-2.5 right-2.5 h-5 rounded-lg bg-[#2a211c] shadow-[0_4px_12px_rgba(0,0,0,0.35)] ring-1 ring-[#c9a87c]/25" />
      <span className="absolute bottom-3.5 right-4 h-2 w-2 rounded-full bg-[#c9a87c]" />
    </span>
  );
}

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
        className="mt-4 grid grid-cols-2 gap-2.5"
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
              className={`rounded-2xl border p-2.5 text-left transition ${
                active
                  ? "border-[color:var(--champagne)] bg-[color:var(--color-cream)] shadow-[0_8px_20px_rgba(0,0,0,0.1)] ring-2 ring-[color:var(--champagne)]/35"
                  : "border-[color:var(--line)] bg-transparent opacity-90 hover:opacity-100"
              }`}
            >
              <ThemeSwatch mode={opt.id} />
              <span className="mt-2.5 block text-sm font-semibold text-ink">{opt.label}</span>
              <span className="mt-0.5 block text-xs text-muted">{opt.hint}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
