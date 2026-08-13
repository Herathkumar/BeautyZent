"use client";

import { SALON_THEMES, type SalonTheme } from "@/lib/salon-themes";

function DarkPreview({ theme }: { theme: SalonTheme }) {
  const d = theme.dark;
  return (
    <span
      className="relative block h-16 w-full overflow-hidden rounded-xl"
      style={{
        background: `radial-gradient(70px 36px at 88% 0%, ${d.accent}38, transparent 62%), linear-gradient(150deg, ${d.bg1} 0%, ${d.bg2} 55%, ${d.bg3} 100%)`,
        boxShadow: `inset 0 0 0 1px ${d.accent}33`,
      }}
      aria-hidden
    >
      <span
        className="absolute left-2.5 top-2.5 block h-1.5 w-9 rounded-full"
        style={{ background: d.accentStrong }}
      />
      <span
        className="absolute left-2.5 top-6 block h-1.5 w-14 rounded-full"
        style={{ background: `${d.text}55` }}
      />
      <span
        className="absolute bottom-2.5 left-2.5 right-8 block h-5 rounded-lg"
        style={{ background: d.surface1, boxShadow: `inset 0 0 0 1px ${d.accent}30` }}
      />
      <span
        className="absolute bottom-3.5 right-2.5 block h-3 w-3 rounded-full"
        style={{ background: d.accent }}
      />
    </span>
  );
}

function LightStrip({ theme }: { theme: SalonTheme }) {
  const l = theme.light;
  return (
    <span
      className="mt-1.5 flex h-4 w-full items-center gap-1 overflow-hidden rounded-md px-1.5"
      style={{
        background: `linear-gradient(90deg, ${l.bg1} 0%, ${l.bg2} 60%, ${l.bg3} 100%)`,
        boxShadow: `inset 0 0 0 1px ${l.accent}2e`,
      }}
      aria-hidden
    >
      <span className="block h-1.5 w-1.5 rounded-full" style={{ background: l.accent }} />
      <span className="block h-1 w-6 rounded-full" style={{ background: `${l.text}40` }} />
      <span
        className="ml-auto block h-2 w-5 rounded-sm"
        style={{ background: l.surface1, boxShadow: `inset 0 0 0 1px ${l.accent}33` }}
      />
    </span>
  );
}

export function ThemePicker({
  legend,
  hint,
  value,
  onChange,
  name,
}: {
  legend: string;
  hint: string;
  value: string;
  onChange: (id: string) => void;
  name: string;
}) {
  return (
    <fieldset className="grid gap-2.5">
      <legend className="text-sm font-medium text-ink">{legend}</legend>
      <p className="text-xs text-muted">{hint}</p>
      <div
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-3"
        role="radiogroup"
        aria-label={legend}
        data-testid={`theme-picker-${name}`}
      >
        {SALON_THEMES.map((theme) => {
          const active = theme.id === value;
          return (
            <button
              key={theme.id}
              type="button"
              role="radio"
              aria-checked={active}
              title={theme.blurb}
              data-testid={`theme-${name}-${theme.id}`}
              onClick={() => onChange(theme.id)}
              className={`rounded-2xl border p-2 text-left transition ${
                active
                  ? "border-cocoa bg-white shadow-[0_8px_20px_rgba(43,37,33,0.1)] ring-2 ring-cocoa/35"
                  : "border-ink/12 bg-white/60 hover:border-ink/30"
              }`}
            >
              <DarkPreview theme={theme} />
              <LightStrip theme={theme} />
              <span className="mt-1.5 block text-xs font-semibold text-ink">{theme.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export const THEME_PICKER_HINT =
  "Dark palette shown; the strip below is its light companion. Staff and clients still toggle light/dark in-app.";
