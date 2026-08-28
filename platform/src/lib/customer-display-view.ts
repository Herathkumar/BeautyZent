export type CustomerDisplayView = "lounge" | "timeline";

export const DEFAULT_CUSTOMER_VIEW: CustomerDisplayView = "lounge";
export const CUSTOMER_VIEW_EVENT = "fhsalon-customer-view-change";

export const CUSTOMER_VIEW_OPTIONS: { id: CustomerDisplayView; label: string; hint: string }[] = [
  {
    id: "lounge",
    label: "Lounge",
    hint: "Stylist chairs, wait times, and the next guest on each chair.",
  },
  {
    id: "timeline",
    label: "Schedule",
    hint: "Day timeline with a column per stylist, like the reception desk.",
  },
];

export function isCustomerDisplayView(value: unknown): value is CustomerDisplayView {
  return value === "lounge" || value === "timeline";
}

export function normalizeCustomerDisplayView(
  value: unknown,
  fallback: CustomerDisplayView = DEFAULT_CUSTOMER_VIEW
): CustomerDisplayView {
  return isCustomerDisplayView(value) ? value : fallback;
}

export function customerViewKey(slug: string) {
  return `fhsalon-customer-view:${slug}`;
}

/** null means this tablet follows the salon default from the platform console. */
export function readCustomerDisplayView(slug: string): CustomerDisplayView | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(customerViewKey(slug));
    return isCustomerDisplayView(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function setCustomerDisplayView(slug: string, view: CustomerDisplayView) {
  try {
    window.localStorage.setItem(customerViewKey(slug), view);
  } catch {
    /* private mode / blocked storage */
  }
  window.dispatchEvent(new CustomEvent(CUSTOMER_VIEW_EVENT, { detail: { slug, view } }));
}
