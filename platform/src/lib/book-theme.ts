export type BookThemePreference = "light" | "dark";
export type BookThemeResolved = BookThemePreference;

export const BOOK_THEME_KEY = "fhsalon-book-theme";
export const BOOK_THEME_EVENT = "fhsalon-book-theme-change";
export const BOOK_THEME_LIGHT = "#f7f1ea";
export const BOOK_THEME_DARK = "#1a1418";

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

  document.querySelectorAll(".book-theme").forEach((el) => {
    el.classList.toggle("book-theme--light", theme === "light");
    el.setAttribute("data-book-theme", theme);
  });

  const color = theme === "light" ? BOOK_THEME_LIGHT : BOOK_THEME_DARK;
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
