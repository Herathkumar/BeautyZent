"use client";

import {
  CUSTOMER_VIEW_OPTIONS,
  setCustomerDisplayView,
  type CustomerDisplayView,
} from "@/lib/customer-display-view";

export function CustomerViewToggle({
  slug,
  view,
}: {
  slug: string;
  view: CustomerDisplayView;
}) {
  return (
    <div
      className="flex shrink-0 rounded-full border border-[color:var(--cd-line)] p-0.5"
      role="group"
      aria-label="Display layout"
      data-testid="customer-view-toggle"
    >
      {CUSTOMER_VIEW_OPTIONS.map((option) => {
        const active = view === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            data-testid={`customer-view-${option.id}`}
            onClick={() => setCustomerDisplayView(slug, option.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide ${
              active
                ? "bg-[var(--cd-accent)] text-[color:var(--cd-on-accent)]"
                : "text-[color:var(--cd-muted)] hover:text-[color:var(--cd-heading)]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export type { CustomerDisplayView };
