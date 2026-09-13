import { DEFAULT_STYLIST_THEME_ID, refreshSalonThemePaint, setThemeColorMeta } from "./salon-themes";

export type StylistTheme = "light" | "dark";

export const STYLIST_THEME_KEY = "fhsalon-stylist-theme";
export const STYLIST_THEME_EVENT = "fhsalon-stylist-theme-change";
export const STYLIST_THEME_LIGHT = "#fafafa";
export const STYLIST_THEME_DARK = "#121110";

export function isStylistTheme(value: unknown): value is StylistTheme {
  return value === "light" || value === "dark";
}

/** Stylist app defaults to BeautyZent quiet-luxury light (Apple Calendar look). */
export function readStylistTheme(): StylistTheme {
  if (typeof window === "undefined") return "light";
  try {
    const raw = window.localStorage.getItem(STYLIST_THEME_KEY);
    return isStylistTheme(raw) ? raw : "light";
  } catch {
    return "light";
  }
}

export function writeStylistTheme(theme: StylistTheme) {
  try {
    window.localStorage.setItem(STYLIST_THEME_KEY, theme);
  } catch {
    /* private mode / blocked storage */
  }
}

export function applyStylistTheme(theme: StylistTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("stylist-shell--light", theme === "light");
  // Drives which half of the salon's theme pack is active (see salon-themes.css).
  root.classList.toggle("theme-light", theme === "light");

  const shells = document.querySelectorAll(".stylist-theme");
  shells.forEach((el) => {
    el.classList.toggle("stylist-theme--light", theme === "light");
  });

  // Keep whatever pack the shell already set (stylistThemeId) — only flip light/dark.
  const packId = root.getAttribute("data-salon-theme") || DEFAULT_STYLIST_THEME_ID;
  refreshSalonThemePaint(packId);
  // Always dock-dark — a mint theme-color paints a white strip under the iPhone dock.
  setThemeColorMeta("--t-dock-bg", STYLIST_THEME_DARK);
}

export function setStylistTheme(theme: StylistTheme) {
  writeStylistTheme(theme);
  applyStylistTheme(theme);
  window.dispatchEvent(new CustomEvent(STYLIST_THEME_EVENT, { detail: theme }));
}
