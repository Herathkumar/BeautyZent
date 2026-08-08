"use client";

import { useEffect, useState } from "react";
import {
  BOOK_THEME_EVENT,
  BOOK_THEME_KEY,
  applyBookTheme,
  readBookThemePreference,
  setBookThemePreference,
  type BookThemePreference,
} from "@/lib/book-theme";

function ThemeSwatch({ mode }: { mode: BookThemePreference }) {
  if (mode === "light") {
    return (
      <span
        className="relative block h-14 w-full overflow-hidden rounded-xl border border-[#c47a4a]/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
        style={{
          background: "linear-gradient(145deg, #fffaf6 0%, #f7f1ea 55%, #efe6dc 100%)",
        }}
        aria-hidden
      >
        <span className="absolute left-2.5 top-2.5 h-2 w-10 rounded-full bg-[#c47a4a]/75" />
        <span className="absolute bottom-2.5 left-2.5 right-2.5 h-5 rounded-lg bg-white shadow-sm ring-1 ring-[#c47a4a]/15" />
        <span className="absolute bottom-3.5 right-4 h-2 w-2 rounded-full bg-[#c47a4a]" />
      </span>
    );
  }

  return (
    <span
      className="relative block h-14 w-full overflow-hidden rounded-xl border border-[#e8b4a2]/35 shadow-[inset_0_1px_0_rgba(242,196,176,0.12)]"
      style={{
        background:
          "radial-gradient(80px 40px at 90% 0%, rgba(232,180,162,0.28), transparent 60%), linear-gradient(145deg, #2a2126 0%, #1a1418 55%, #140f13 100%)",
      }}
      aria-hidden
    >
      <span className="absolute left-2.5 top-2.5 h-2 w-10 rounded-full bg-[#f2c4b0]/90" />
      <span className="absolute bottom-2.5 left-2.5 right-2.5 h-5 rounded-lg bg-[#3a2830] shadow-[0_4px_12px_rgba(0,0,0,0.35)] ring-1 ring-[#e8b4a2]/30" />
      <span className="absolute bottom-3.5 right-4 h-2 w-2 rounded-full bg-[#e8b4a2]" />
    </span>
  );
}

/** Light / dark switcher for the FHS Client app, mirroring the Stylist app. */
export function BookThemeToggle() {
  const [theme, setTheme] = useState<BookThemePreference>("dark");

  useEffect(() => {
    setTheme(readBookThemePreference());
    const onStorage = (e: StorageEvent) => {
      if (e.key !== BOOK_THEME_KEY) return;
      setTheme(e.newValue === "light" ? "light" : "dark");
    };
    const onLocal = (e: Event) => {
      const detail = (e as CustomEvent<BookThemePreference>).detail;
      if (detail === "dark" || detail === "light") setTheme(detail);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(BOOK_THEME_EVENT, onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(BOOK_THEME_EVENT, onLocal);
    };
  }, []);

  return (
    <section
      className="book-card rounded-2xl p-5"
      data-testid="book-theme-toggle"
    >
      <p className="text-xs font-semibold tracking-[0.16em] text-champagne uppercase">
        Appearance
      </p>
      <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-ink">
        Theme
      </h2>
      <p className="mt-1 text-sm text-muted">
        Switch between rose cream light and salon dark on this device.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2.5" role="group" aria-label="App theme">
        {(
          [
            { id: "light", label: "Light", hint: "Rose cream" },
            { id: "dark", label: "Dark", hint: "Salon night" },
          ] as const
        ).map((opt) => {
          const active = theme === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={active}
              data-testid={`book-theme-${opt.id}`}
              onClick={() => setBookThemePreference(opt.id)}
              className={`rounded-2xl border p-2.5 text-left transition ${
                active
                  ? "border-[color:var(--champagne)] bg-[color:var(--color-cream)] shadow-[0_8px_20px_rgba(0,0,0,0.12)] ring-2 ring-[color:var(--champagne)]/35"
                  : "border-[color:var(--line)] bg-transparent opacity-90 hover:opacity-100"
              }`}
            >
              <ThemeSwatch mode={opt.id} />
              <span className="mt-2.5 block text-sm font-semibold text-ink">
                {opt.label}
              </span>
              <span className="mt-0.5 block text-xs text-muted">{opt.hint}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** Applies the saved theme on mount and keeps tabs in sync. */
export function BookThemeBoot({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const apply = () => applyBookTheme(readBookThemePreference());
    apply();
    window.addEventListener(BOOK_THEME_EVENT, apply);
    return () => window.removeEventListener(BOOK_THEME_EVENT, apply);
  }, []);

  return <>{children}</>;
}
