export type ReceptionTheme = "light" | "dark";

export const RECEPTION_THEME_KEY = "fhsalon-reception-theme";
export const RECEPTION_THEME_EVENT = "fhsalon-reception-theme-change";
export const RECEPTION_THEME_LIGHT = "#f3ebe3";
export const RECEPTION_THEME_DARK = "#0e1016";

export function isReceptionTheme(value: unknown): value is ReceptionTheme {
  return value === "light" || value === "dark";
}

export function readReceptionTheme(): ReceptionTheme {
  if (typeof window === "undefined") return "dark";
  try {
    const raw = window.localStorage.getItem(RECEPTION_THEME_KEY);
    return isReceptionTheme(raw) ? raw : "dark";
  } catch {
    return "dark";
  }
}

export function writeReceptionTheme(theme: ReceptionTheme) {
  try {
    window.localStorage.setItem(RECEPTION_THEME_KEY, theme);
  } catch {
    /* private mode / blocked storage */
  }
}

export function applyReceptionTheme(theme: ReceptionTheme, root?: HTMLElement | null) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.classList.toggle("reception-shell--light", theme === "light");
  html.classList.toggle("reception-shell--dark", theme !== "light");

  const boards = root
    ? [root]
    : Array.from(document.querySelectorAll<HTMLElement>(".reception-board"));
  boards.forEach((el) => {
    el.dataset.receptionTheme = theme;
    el.classList.toggle("reception-board--light", theme === "light");
  });
}

export function setReceptionTheme(theme: ReceptionTheme) {
  writeReceptionTheme(theme);
  applyReceptionTheme(theme);
  window.dispatchEvent(new CustomEvent(RECEPTION_THEME_EVENT, { detail: theme }));
}
