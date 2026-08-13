import { DEFAULT_MANAGER_THEME_ID, refreshSalonThemePaint, setThemeColorMeta } from "./salon-themes";

export type ManagerTheme = "light" | "dark";

export const MANAGER_THEME_KEY = "fhsalon-manager-theme";
export const MANAGER_THEME_EVENT = "fhsalon-manager-theme-change";
export const MANAGER_THEME_LIGHT = "#fdf8f3";
export const MANAGER_THEME_DARK = "#1c1714";

export function isManagerTheme(value: unknown): value is ManagerTheme {
  return value === "light" || value === "dark";
}

export function readManagerTheme(): ManagerTheme {
  if (typeof window === "undefined") return "light";
  try {
    const raw = window.localStorage.getItem(MANAGER_THEME_KEY);
    return isManagerTheme(raw) ? raw : "light";
  } catch {
    return "light";
  }
}

export function writeManagerTheme(theme: ManagerTheme) {
  try {
    window.localStorage.setItem(MANAGER_THEME_KEY, theme);
  } catch {
    /* private mode / blocked storage */
  }
}

export function applyManagerTheme(theme: ManagerTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("manager-shell--dark", theme === "dark");
  // Drives which half of the salon's theme pack is active (see salon-themes.css).
  root.classList.toggle("theme-light", theme !== "dark");

  const shells = document.querySelectorAll(".admin-theme");
  shells.forEach((el) => {
    el.classList.toggle("admin-theme--dark", theme === "dark");
  });

  // Keep the current pack id — only flip light/dark half (do not fall back to cocoa).
  const packId =
    root.getAttribute("data-salon-theme") ||
    DEFAULT_MANAGER_THEME_ID;
  refreshSalonThemePaint(packId);
  setThemeColorMeta("--t-bg-2", theme === "dark" ? MANAGER_THEME_DARK : MANAGER_THEME_LIGHT);
}

export function setManagerTheme(theme: ManagerTheme) {
  writeManagerTheme(theme);
  applyManagerTheme(theme);
  window.dispatchEvent(new CustomEvent(MANAGER_THEME_EVENT, { detail: theme }));
}
