"use client";

import { useEffect, useState } from "react";
import {
  STYLIST_THEME_EVENT,
  STYLIST_THEME_KEY,
  readStylistTheme,
  setStylistTheme,
  type StylistTheme,
} from "@/lib/stylist-theme";

function ThemeSwatch({ mode }: { mode: StylistTheme }) {
  if (mode === "light") {
    return (
      <span
        className="relative block h-14 w-full overflow-hidden rounded-xl border border-[#2a8f82]/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
        style={{
          background:
            "linear-gradient(145deg, #f4fbfa 0%, #e8f4f1 55%, #dceee9 100%)",
        }}
        aria-hidden
      >
        <span className="absolute left-2.5 top-2.5 h-2 w-10 rounded-full bg-[#2a8f82]/75" />
        <span className="absolute bottom-2.5 left-2.5 right-2.5 h-5 rounded-lg bg-white shadow-sm ring-1 ring-[#2a8f82]/15" />
        <span className="absolute bottom-3.5 right-4 h-2 w-2 rounded-full bg-[#2a8f82]" />
      </span>
    );
  }

  return (
    <span
      className="relative block h-14 w-full overflow-hidden rounded-xl border border-[#7ec4b8]/35 shadow-[inset_0_1px_0_rgba(181,235,224,0.12)]"
      style={{
        background:
          "radial-gradient(80px 40px at 90% 0%, rgba(126,196,184,0.28), transparent 60%), linear-gradient(145deg, #152226 0%, #0e1618 55%, #0a1114 100%)",
      }}
      aria-hidden
    >
      <span className="absolute left-2.5 top-2.5 h-2 w-10 rounded-full bg-[#b5ebe0]/9" />
      <span className="absolute bottom-2.5 left-2.5 right-2.5 h-5 rounded-lg bg-[#1a282c] shadow-[0_4px_12px_rgba(0,0,0,0.35)] ring-1 ring-[#7ec4b8]/3" />
      <span className="absolute bottom-3.5 right-4 h-2 w-2 rounded-full bg-[#7ec4b8]" />
    </span>
  );
}

export function StylistThemeToggle() {
  const [theme, setTheme] = useState<StylistTheme>("dark");

  useEffect(() => {
    setTheme(readStylistTheme());
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STYLIST_THEME_KEY) return;
      setTheme(e.newValue === "light" ? "light" : "dark");
    };
    const onLocal = (e: Event) => {
      const detail = (e as CustomEvent<StylistTheme>).detail;
      if (detail === "dark" || detail === "light") setTheme(detail);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(STYLIST_THEME_EVENT, onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(STYLIST_THEME_EVENT, onLocal);
    };
  }, []);

  return (
    <section
      className="admin-stat-card rounded-2xl p-5"
      data-testid="stylist-theme-toggle"
    >
      <p className="text-xs font-semibold tracking-[0.16em] text-champagne uppercase">
        Appearance
      </p>
      <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-ink">
        Theme
      </h2>
      <p className="mt-1 text-sm text-muted">
        Switch between sea-glass light and teal dark for the Stylist app on this device.
      </p>
      <div
        className="mt-4 grid grid-cols-2 gap-2.5"
        role="group"
        aria-label="Stylist theme"
      >
        {(
          [
            { id: "light", label: "Light", hint: "Sea mist" },
            { id: "dark", label: "Dark", hint: "Teal" },
          ] as const
        ).map((opt) => {
          const active = theme === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={active}
              data-testid={`stylist-theme-${opt.id}`}
              onClick={() => setStylistTheme(opt.id)}
              className={`rounded-2xl border p-2.5 text-left transition ${
                active
                  ? "border-[color:var(--champagne)] bg-[color:var(--color-cream)] shadow-[0_8px_20px_rgba(0,0,0,0.12)] ring-2 ring-[color:var(--champagne)]/35"
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
