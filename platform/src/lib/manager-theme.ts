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

  const shells = document.querySelectorAll(".admin-theme");
  shells.forEach((el) => {
    el.classList.toggle("admin-theme--dark", theme === "dark");
  });

  const color = theme === "dark" ? MANAGER_THEME_DARK : MANAGER_THEME_LIGHT;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", color);
}

export function setManagerTheme(theme: ManagerTheme) {
  writeManagerTheme(theme);
  applyManagerTheme(theme);
  window.dispatchEvent(new CustomEvent(MANAGER_THEME_EVENT, { detail: theme }));
}
