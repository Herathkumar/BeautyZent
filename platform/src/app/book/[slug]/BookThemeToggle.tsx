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
        className="relative block h-14 w-full overflow-hidden rounded-xl border border-[#6b4ea8]/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
        style={{
          background: "linear-gradient(145deg, #fcfaff 0%, #f7f3fb 55%, #efe8f7 100%)",
        }}
        aria-hidden
      >
        <span className="absolute left-2.5 top-2.5 h-2 w-10 rounded-full bg-[#6b4ea8]/75" />
        <span className="absolute bottom-2.5 left-2.5 right-2.5 h-5 rounded-lg bg-white shadow-sm ring-1 ring-[#6b4ea8]/15" />
        <span className="absolute bottom-3.5 right-4 h-2 w-2 rounded-full bg-[#6b4ea8]" />
      </span>
    );
  }

  return (
    <span
      className="relative block h-14 w-full overflow-hidden rounded-xl border border-[#c9b4e8]/35 shadow-[inset_0_1px_0_rgba(224,208,245,0.12)]"
      style={{
        background:
          "radial-gradient(80px 40px at 90% 0%, rgba(201,180,232,0.28), transparent 60%), linear-gradient(145deg, #2a2038 0%, #17121f 55%, #100c16 100%)",
      }}
      aria-hidden
    >
      <span className="absolute left-2.5 top-2.5 h-2 w-10 rounded-full bg-[#e0d0f5]/90" />
      <span className="absolute bottom-2.5 left-2.5 right-2.5 h-5 rounded-lg bg-[#35264a] shadow-[0_4px_12px_rgba(0,0,0,0.35)] ring-1 ring-[#c9b4e8]/30" />
      <span className="absolute bottom-3.5 right-4 h-2 w-2 rounded-full bg-[#c9b4e8]" />
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
        Switch between lilac mist light and plum dark on this device.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2.5" role="group" aria-label="App theme">
        {(
          [
            { id: "light", label: "Light", hint: "Lilac mist" },
            { id: "dark", label: "Dark", hint: "Plum night" },
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
