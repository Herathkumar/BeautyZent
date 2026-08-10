export type StylistTheme = "light" | "dark";

export const STYLIST_THEME_KEY = "fhsalon-stylist-theme";
export const STYLIST_THEME_EVENT = "fhsalon-stylist-theme-change";
export const STYLIST_THEME_LIGHT = "#eef7f5";
export const STYLIST_THEME_DARK = "#0e1618";

export function isStylistTheme(value: unknown): value is StylistTheme {
  return value === "light" || value === "dark";
}

/** Stylist app defaults to the current sea-glass dark theme. */
export function readStylistTheme(): StylistTheme {
  if (typeof window === "undefined") return "dark";
  try {
    const raw = window.localStorage.getItem(STYLIST_THEME_KEY);
    return isStylistTheme(raw) ? raw : "dark";
  } catch {
    return "dark";
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
  // Light preference uses the sea-glass dark surfaces; dark preference uses mist light.
  root.classList.toggle("stylist-shell--light", theme === "dark");

  const shells = document.querySelectorAll(".stylist-theme");
  shells.forEach((el) => {
    el.classList.toggle("stylist-theme--light", theme === "dark");
  });

  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  // Match black bottom nav so iOS home-indicator / overscroll never flash mint/white.
  meta.setAttribute("content", STYLIST_THEME_DARK);
}

export function setStylistTheme(theme: StylistTheme) {
  writeStylistTheme(theme);
  applyStylistTheme(theme);
  window.dispatchEvent(new CustomEvent(STYLIST_THEME_EVENT, { detail: theme }));
}
