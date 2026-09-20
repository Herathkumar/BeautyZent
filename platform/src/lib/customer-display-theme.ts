export type CustomerDisplayTheme = "light" | "dark";

export const CUSTOMER_THEME_KEY = "fhsalon-customer-theme";
export const CUSTOMER_THEME_EVENT = "fhsalon-customer-theme-change";
export const CUSTOMER_THEME_LIGHT = "#fafafa";
export const CUSTOMER_THEME_DARK = "#121110";

export function isCustomerDisplayTheme(value: unknown): value is CustomerDisplayTheme {
  return value === "light" || value === "dark";
}

export function readCustomerDisplayTheme(): CustomerDisplayTheme {
  if (typeof window === "undefined") return "light";
  try {
    const raw = window.localStorage.getItem(CUSTOMER_THEME_KEY);
    return isCustomerDisplayTheme(raw) ? raw : "light";
  } catch {
    return "light";
  }
}

export function writeCustomerDisplayTheme(theme: CustomerDisplayTheme) {
  try {
    window.localStorage.setItem(CUSTOMER_THEME_KEY, theme);
  } catch {
    /* private mode / blocked storage */
  }
}

export function applyCustomerDisplayTheme(
  theme: CustomerDisplayTheme,
  root?: HTMLElement | null
) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.classList.toggle("customer-shell--light", theme === "light");
  html.classList.toggle("customer-shell--dark", theme !== "light");

  const boards = root
    ? [root]
    : Array.from(document.querySelectorAll<HTMLElement>(".customer-board"));
  boards.forEach((el) => {
    el.dataset.customerTheme = theme;
    el.classList.toggle("customer-board--dark", theme === "dark");
  });
}

export function setCustomerDisplayTheme(theme: CustomerDisplayTheme) {
  writeCustomerDisplayTheme(theme);
  applyCustomerDisplayTheme(theme);
  window.dispatchEvent(new CustomEvent(CUSTOMER_THEME_EVENT, { detail: theme }));
}
