"use client";

import { useEffect, useState } from "react";
import {
  BOOK_THEME_EVENT,
  applyBookTheme,
  readBookThemePreference,
  setBookThemePreference,
  type BookThemePreference,
} from "@/lib/book-theme";

function ThemePreview({ mode }: { mode: "light" | "dark" | "system" }) {
  if (mode === "system") {
    return (
      <span
        className="relative block h-[4.5rem] w-full overflow-hidden rounded-2xl border border-black/10"
        aria-hidden
      >
        <span
          className="absolute inset-y-0 left-0 w-1/2"
          style={{
            background: "linear-gradient(160deg,#fffaf6 0%,#f3ebe3 100%)",
          }}
        />
        <span
          className="absolute inset-y-0 right-0 w-1/2"
          style={{
            background: "linear-gradient(160deg,#2a2126 0%,#1a1418 100%)",
          }}
        />
        <span className="absolute left-2 top-2 h-5 w-5 rounded-md bg-[#e8b4a2]/85" />
        <span className="absolute right-2 top-2 h-5 w-5 rounded-md bg-[#f2c4b0]/7" />
        <span className="absolute bottom-2 left-2 right-[52%] h-2 rounded-full bg-[#7d6154]/35" />
        <span className="absolute bottom-2 left-[52%] right-2 h-2 rounded-full bg-white/35" />
      </span>
    );
  }

  if (mode === "light") {
    return (
      <span
        className="relative block h-[4.5rem] w-full overflow-hidden rounded-2xl border border-[#7d6154]/2"
        style={{ background: "linear-gradient(160deg,#fffaf6 0%,#f3ebe3 100%)" }}
        aria-hidden
      >
        <span className="absolute left-2.5 top-2.5 h-5 w-5 rounded-md bg-[#e8b4a2]" />
        <span className="absolute bottom-3 left-2.5 right-2.5 h-6 rounded-lg bg-white shadow-sm ring-1 ring-[#7d6154]/12" />
      </span>
    );
  }

  return (
    <span
      className="relative block h-[4.5rem] w-full overflow-hidden rounded-2xl border border-white/10"
      style={{ background: "linear-gradient(160deg,#2a2126 0%,#1a1418 100%)" }}
      aria-hidden
    >
      <span className="absolute left-2.5 top-2.5 h-5 w-5 rounded-md bg-[#f2c4b0]/85" />
      <span className="absolute bottom-3 left-2.5 right-2.5 h-6 rounded-lg bg-[#3a2830] ring-1 ring-[#e8b4a2]/25" />
    </span>
  );
}

const OPTIONS: { id: BookThemePreference; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "Device default" },
];

export function BookThemePicker({
  open,
  title = "Booking is available in light & dark mode!",
  subtitle = "You can change this now or anytime in Appearance.",
  confirmLabel = "Got it",
  onClose,
}: {
  open: boolean;
  title?: string;
  subtitle?: string;
  confirmLabel?: string;
  onClose: () => void;
}) {
  const [pref, setPref] = useState<BookThemePreference>("dark");

  useEffect(() => {
    if (!open) return;
    const current = readBookThemePreference();
    setPref(current);
    applyBookTheme(current);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        className="book-theme-picker w-full max-w-lg rounded-[1.75rem] bg-white p-5 text-[#1c1714] shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-7"
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-theme-picker-title"
      >
        <h2
          id="book-theme-picker-title"
          className="text-center font-[family-name:var(--font-display)] text-2xl leading-tight sm:text-[1.65rem]"
        >
          {title}
        </h2>
        <p className="mt-2 text-center text-sm text-[#5c4f47]">{subtitle}</p>

        <div className="mt-6 grid grid-cols-3 gap-2.5 sm:gap-3">
          {OPTIONS.map((opt) => {
            const active = pref === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setPref(opt.id);
                  applyBookTheme(opt.id);
                }}
                className={`rounded-2xl p-2 text-left transition ${
                  active
                    ? "bg-[#f3e7df] ring-2 ring-[#c47a4a]/55"
                    : "bg-[#f7f3ee] ring-1 ring-transparent hover:bg-[#f1ebe4]"
                }`}
                aria-pressed={active}
              >
                <ThemePreview mode={opt.id} />
                <span className="mt-2.5 flex items-center gap-2 px-0.5">
                  <span
                    className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${
                      active
                        ? "border-[#c47a4a] bg-[#c47a4a]"
                        : "border-[#8a7a70] bg-white"
                    }`}
                    aria-hidden
                  >
                    {active ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    ) : null}
                  </span>
                  <span className="text-xs font-semibold sm:text-sm">{opt.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="mt-6 w-full rounded-full bg-[#c47a4a] px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(196,122,74,0.28)]"
          onClick={() => {
            setBookThemePreference(pref);
            onClose();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

/** Applies saved booking theme on mount and listens for system / preference changes. */
export function BookThemeBoot({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const apply = () => applyBookTheme(readBookThemePreference());
    apply();

    const onPref = () => apply();
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onSystem = () => {
      if (readBookThemePreference() === "system") apply();
    };
    window.addEventListener(BOOK_THEME_EVENT, onPref);
    mq.addEventListener("change", onSystem);
    return () => {
      window.removeEventListener(BOOK_THEME_EVENT, onPref);
      mq.removeEventListener("change", onSystem);
    };
  }, []);

  return <>{children}</>;
}
