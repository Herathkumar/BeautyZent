"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import {
  applySalonThemeId,
  getSalonTheme,
  type ThemePalette,
} from "@/lib/salon-themes";

type Mode = "light" | "dark";

function Swatch({ palette, mode }: { palette: ThemePalette; mode: Mode }) {
  const dark = mode === "dark";
  return (
    <span
      className="relative block h-14 w-full overflow-hidden rounded-xl"
      style={{
        background: dark
          ? `radial-gradient(80px 40px at 90% 0%, ${palette.accent}47, transparent 60%), linear-gradient(145deg, ${palette.bg1} 0%, ${palette.bg2} 55%, ${palette.bg3} 100%)`
          : `linear-gradient(145deg, ${palette.bg1} 0%, ${palette.bg2} 55%, ${palette.bg3} 100%)`,
        boxShadow: `inset 0 0 0 1px ${palette.accent}40`,
      }}
      aria-hidden
    >
      <span
        className="absolute left-2.5 top-2.5 block h-2 w-10 rounded-full"
        style={{ background: palette.accentStrong }}
      />
      <span
        className="absolute bottom-2.5 left-2.5 right-2.5 block h-5 rounded-lg"
        style={{ background: palette.surface1, boxShadow: `inset 0 0 0 1px ${palette.accent}2e` }}
      />
      <span
        className="absolute bottom-3.5 right-4 block h-2 w-2 rounded-full"
        style={{ background: palette.accent }}
      />
    </span>
  );
}

/** Reads the pack the shell put on <html> so swatches match the salon's theme. */
function useHtmlThemeId(fallbackId: string) {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setId(root.getAttribute("data-salon-theme"));
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["data-salon-theme"] });
    return () => observer.disconnect();
  }, []);

  return id ?? fallbackId;
}

/**
 * Shared light/dark switcher for the booking, manager, and stylist apps.
 * Pass `packId` (from the salon API) for manager/stylist so we don't depend on a
 * stale html attribute left over from the booking app or boot defaults.
 */
export function AppearanceToggle({
  cardClassName,
  testId,
  optionTestIdPrefix,
  ariaLabel,
  fallbackThemeId,
  packId,
  value,
  onChange,
}: {
  cardClassName: string;
  testId: string;
  optionTestIdPrefix: string;
  ariaLabel: string;
  fallbackThemeId: string;
  /** Explicit salon pack for this app (managerThemeId / stylistThemeId / bookingThemeId). */
  packId?: string | null;
  value: Mode;
  onChange: (mode: Mode) => void;
}) {
  const htmlId = useHtmlThemeId(fallbackThemeId);
  const resolvedId = packId?.trim() || htmlId;
  const theme = getSalonTheme(resolvedId, fallbackThemeId);

  useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    const id =
      packId?.trim() ||
      document.documentElement.getAttribute("data-salon-theme") ||
      fallbackThemeId;
    applySalonThemeId(id, fallbackThemeId);
  }, [packId, fallbackThemeId, value]);

  return (
    <section className={`${cardClassName} rounded-2xl p-5`} data-testid={testId}>
      <p className="text-xs font-semibold tracking-[0.16em] text-champagne uppercase">Appearance</p>
      <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-ink">Theme</h2>
      <p className="mt-1 text-sm text-muted">
        Your salon uses {theme.label}. Pick its light or dark side for this device.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2.5" role="group" aria-label={ariaLabel}>
        {(
          [
            { id: "light", label: "Light", palette: theme.light },
            { id: "dark", label: "Dark", palette: theme.dark },
          ] as const
        ).map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={active}
              data-testid={`${optionTestIdPrefix}-${opt.id}`}
              onClick={() => onChange(opt.id)}
              className={`rounded-2xl border p-2.5 text-left transition ${
                active
                  ? "border-[color:var(--champagne)] bg-[color:var(--color-cream)] shadow-[0_8px_20px_rgba(0,0,0,0.12)] ring-2 ring-[color:var(--champagne)]/35"
                  : "border-[color:var(--line)] bg-transparent opacity-90 hover:opacity-100"
              }`}
            >
              <Swatch palette={opt.palette} mode={opt.id} />
              <span className="mt-2.5 block text-sm font-semibold text-ink">{opt.label}</span>
              <span className="mt-0.5 block text-xs text-muted">{theme.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
