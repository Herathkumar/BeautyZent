import { applyBookTheme, writeBookThemePreference } from "@/lib/book-theme";
import { applySalonThemeId } from "@/lib/salon-themes";

/** Warm cocoa pack — matches BeautyZent Explore / paper-shell marketplace chrome. */
export const MARKETPLACE_BOOK_THEME_ID = "cocoa";

const SESSION_KEY = "fhsalon-book-from-market";
const LUXE_MIGRATION_KEY = "fhsalon-book-luxe-v3";

export function rememberMarketplaceBookEntry() {
  if (typeof window === "undefined") return;
  try {
    if (/[?&]from=explore(?:&|$)/.test(window.location.search || "")) {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    }
  } catch {
    /* private mode */
  }
}

export function isMarketplaceBookSession() {
  if (typeof window === "undefined") return false;
  try {
    if (/[?&]from=explore(?:&|$)/.test(window.location.search || "")) return true;
    return window.sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return /[?&]from=explore(?:&|$)/.test(window.location.search || "");
  }
}

/** Cocoa gold luxury pack for every client booking session. Always dark. */
export function applyMarketplaceBookTheme() {
  if (typeof document === "undefined") return;
  rememberMarketplaceBookEntry();
  const root = document.documentElement;
  root.setAttribute("data-salon-theme", MARKETPLACE_BOOK_THEME_ID);
  root.classList.add("book-shell", "book-shell--marketplace");
  root.classList.remove("book-shell--light", "theme-light");
  applySalonThemeId(MARKETPLACE_BOOK_THEME_ID, MARKETPLACE_BOOK_THEME_ID);
  try {
    window.localStorage.setItem(LUXE_MIGRATION_KEY, "1");
    writeBookThemePreference("dark");
  } catch {
    /* private mode */
  }
  applyBookTheme("dark");
}
