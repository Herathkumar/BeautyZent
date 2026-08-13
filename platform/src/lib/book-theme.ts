import { DEFAULT_BOOKING_THEME_ID, refreshSalonThemePaint, setThemeColorMeta } from "./salon-themes";

export type BookThemePreference = "light" | "dark";
export type BookThemeResolved = BookThemePreference;

export const BOOK_THEME_KEY = "fhsalon-book-theme";
export const BOOK_THEME_EVENT = "fhsalon-book-theme-change";
export const BOOK_THEME_LIGHT = "#f7f3fb";
export const BOOK_THEME_DARK = "#17121f";

export function isBookThemePreference(value: unknown): value is BookThemePreference {
  return value === "light" || value === "dark";
}

function deviceTheme(): BookThemePreference {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function readBookThemePreference(): BookThemePreference {
  if (typeof window === "undefined") return "dark";
  try {
    const raw = window.localStorage.getItem(BOOK_THEME_KEY);
    if (isBookThemePreference(raw)) return raw;
    // Anyone still on the old "device default" setting keeps what they see today.
    if (raw === "system") return deviceTheme();
    return "dark";
  } catch {
    return "dark";
  }
}

export function writeBookThemePreference(theme: BookThemePreference) {
  try {
    window.localStorage.setItem(BOOK_THEME_KEY, theme);
  } catch {
    /* private mode */
  }
}

export function applyBookTheme(theme: BookThemePreference) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.add("book-shell");
  root.classList.toggle("book-shell--light", theme === "light");
  // Drives which half of the salon's theme pack is active (see salon-themes.css).
  root.classList.toggle("theme-light", theme === "light");

  document.querySelectorAll(".book-theme").forEach((el) => {
    el.classList.toggle("book-theme--light", theme === "light");
    el.setAttribute("data-book-theme", theme);
  });

  // Keep the current salon pack (indigo/noir/…) — only flip light/dark half.
  const packId = root.getAttribute("data-salon-theme") || DEFAULT_BOOKING_THEME_ID;
  refreshSalonThemePaint(packId);
  setThemeColorMeta("--t-bg-2", theme === "light" ? BOOK_THEME_LIGHT : BOOK_THEME_DARK);
}

export function setBookThemePreference(theme: BookThemePreference) {
  writeBookThemePreference(theme);
  applyBookTheme(theme);
  window.dispatchEvent(new CustomEvent(BOOK_THEME_EVENT, { detail: theme }));
}
