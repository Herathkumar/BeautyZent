"use client";

import { useEffect, useState } from "react";
import {
  CUSTOMER_THEME_EVENT,
  CUSTOMER_THEME_KEY,
  readCustomerDisplayTheme,
  setCustomerDisplayTheme,
  type CustomerDisplayTheme,
} from "@/lib/customer-display-theme";

export function CustomerThemeToggle() {
  const [theme, setTheme] = useState<CustomerDisplayTheme>("light");

  useEffect(() => {
    setTheme(readCustomerDisplayTheme());
    const onStorage = (e: StorageEvent) => {
      if (e.key !== CUSTOMER_THEME_KEY) return;
      setTheme(e.newValue === "dark" ? "dark" : "light");
    };
    const onLocal = (e: Event) => {
      const detail = (e as CustomEvent<CustomerDisplayTheme>).detail;
      if (detail === "dark" || detail === "light") setTheme(detail);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(CUSTOMER_THEME_EVENT, onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CUSTOMER_THEME_EVENT, onLocal);
    };
  }, []);

  const option = (id: CustomerDisplayTheme, label: string) => {
    const active = theme === id;
    return (
      <button
        type="button"
        aria-pressed={active}
        data-testid={`customer-theme-${id}`}
        onClick={() => setCustomerDisplayTheme(id)}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide ${
          active
            ? "bg-[var(--cd-accent)] text-[color:var(--cd-on-accent)]"
            : "text-[color:var(--cd-muted)] hover:text-[color:var(--cd-heading)]"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      className="flex shrink-0 rounded-full border border-[color:var(--cd-line)] p-0.5"
      role="group"
      aria-label="Appearance"
      data-testid="customer-theme-toggle"
    >
      {option("light", "Light")}
      {option("dark", "Dark")}
    </div>
  );
}
