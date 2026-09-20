import { DEFAULT_STYLIST_THEME_ID, refreshSalonThemePaint, setThemeColorMeta } from "./salon-themes";

export type StylistTheme = "light" | "dark";

export const STYLIST_THEME_KEY = "fhsalon-stylist-theme";
export const STYLIST_THEME_EVENT = "fhsalon-stylist-theme-change";
/** Cream marketplace shell — single locked look (no light/dark toggle). */
export const STYLIST_THEME_CREAM = "#f6f2eb";
export const STYLIST_THEME_LIGHT = STYLIST_THEME_CREAM;
export const STYLIST_THEME_DARK = STYLIST_THEME_CREAM;

export function isStylistTheme(value: unknown): value is StylistTheme {
  return value === "light" || value === "dark";
}

/** Stylist app is locked to cream / house gold (booking-sheet look). */
export function readStylistTheme(): StylistTheme {
  return "light";
}

export function writeStylistTheme(_theme: StylistTheme) {
  try {
    window.localStorage.setItem(STYLIST_THEME_KEY, "light");
  } catch {
    /* private mode / blocked storage */
  }
}

export function applyStylistTheme(_theme: StylistTheme = "light") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.add("stylist-shell");
  root.classList.add("stylist-shell--light");
  root.classList.add("theme-light");
  root.classList.remove("theme-dark");

  const shells = document.querySelectorAll(".stylist-theme");
  shells.forEach((el) => {
    el.classList.add("stylist-theme--light");
  });

  const packId = root.getAttribute("data-salon-theme") || DEFAULT_STYLIST_THEME_ID;
  refreshSalonThemePaint(packId);
  setThemeColorMeta("--t-dock-bg", STYLIST_THEME_CREAM);
}

export function setStylistTheme(_theme: StylistTheme) {
  writeStylistTheme("light");
  applyStylistTheme("light");
  window.dispatchEvent(new CustomEvent(STYLIST_THEME_EVENT, { detail: "light" }));
}
