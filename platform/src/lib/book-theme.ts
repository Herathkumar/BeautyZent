export type BookThemePreference = "light" | "dark" | "system";
export type BookThemeResolved = "light" | "dark";

export const BOOK_THEME_KEY = "fhsalon-book-theme";
export const BOOK_THEME_EVENT = "fhsalon-book-theme-change";
export const BOOK_THEME_LIGHT = "#f7f1ea";
export const BOOK_THEME_DARK = "#1a1418";

export function isBookThemePreference(value: unknown): value is BookThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function readBookThemePreference(): BookThemePreference {
  if (typeof window === "undefined") return "dark";
  try {
    const raw = window.localStorage.getItem(BOOK_THEME_KEY);
    return isBookThemePreference(raw) ? raw : "dark";
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

export function resolveBookTheme(pref: BookThemePreference): BookThemeResolved {
  if (pref === "light" || pref === "dark") return pref;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyBookTheme(pref: BookThemePreference) {
  if (typeof document === "undefined") return;
  const resolved = resolveBookTheme(pref);
  const root = document.documentElement;
  root.classList.add("book-shell");
  root.classList.toggle("book-shell--light", resolved === "light");

  document.querySelectorAll(".book-theme").forEach((el) => {
    el.classList.toggle("book-theme--light", resolved === "light");
    el.setAttribute("data-book-theme", resolved);
  });

  const color = resolved === "light" ? BOOK_THEME_LIGHT : BOOK_THEME_DARK;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", color);
}

export function setBookThemePreference(theme: BookThemePreference) {
  writeBookThemePreference(theme);
  applyBookTheme(theme);
  window.dispatchEvent(new CustomEvent(BOOK_THEME_EVENT, { detail: theme }));
}
