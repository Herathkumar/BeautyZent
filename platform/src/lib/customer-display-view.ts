export type CustomerDisplayView = "lounge" | "timeline";

/** Manager policy for how the customer TV picks Lounge vs Schedule. */
export type CustomerDisplayViewControl = "manual" | "lounge" | "timeline" | "rotate";

export const DEFAULT_CUSTOMER_VIEW: CustomerDisplayView = "lounge";
export const DEFAULT_CUSTOMER_VIEW_CONTROL: CustomerDisplayViewControl = "manual";
export const DEFAULT_CUSTOMER_VIEW_ROTATE_SEC = 60;
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

export const CUSTOMER_VIEW_CONTROL_OPTIONS: {
  id: CustomerDisplayViewControl;
  label: string;
  hint: string;
}[] = [
  {
    id: "manual",
    label: "Manual switch on display",
    hint: "Staff can toggle Lounge / Schedule on the TV itself.",
  },
  {
    id: "lounge",
    label: "Show Lounge",
    hint: "Always show stylist chairs. Hide the on-screen switch.",
  },
  {
    id: "timeline",
    label: "Show Schedule",
    hint: "Always show the day schedule. Hide the on-screen switch.",
  },
  {
    id: "rotate",
    label: "Switch automatically",
    hint: "Alternate Lounge and Schedule on a timer you set.",
  },
];

export function isCustomerDisplayView(value: unknown): value is CustomerDisplayView {
  return value === "lounge" || value === "timeline";
}

export function isCustomerDisplayViewControl(
  value: unknown
): value is CustomerDisplayViewControl {
  return value === "manual" || value === "lounge" || value === "timeline" || value === "rotate";
}

export function normalizeCustomerDisplayView(
  value: unknown,
  fallback: CustomerDisplayView = DEFAULT_CUSTOMER_VIEW
): CustomerDisplayView {
  return isCustomerDisplayView(value) ? value : fallback;
}

export function normalizeCustomerDisplayViewControl(
  value: unknown,
  fallback: CustomerDisplayViewControl = DEFAULT_CUSTOMER_VIEW_CONTROL
): CustomerDisplayViewControl {
  return isCustomerDisplayViewControl(value) ? value : fallback;
}

export function normalizeCustomerDisplayViewRotateSec(
  value: unknown,
  fallback = DEFAULT_CUSTOMER_VIEW_ROTATE_SEC
): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(600, Math.max(5, n));
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

/** Resolve what the TV should show given manager policy + optional tablet override. */
export function resolveCustomerDisplayView(input: {
  control: CustomerDisplayViewControl;
  defaultView?: CustomerDisplayView | null;
  tabletOverride?: CustomerDisplayView | null;
  rotateView?: CustomerDisplayView | null;
}): CustomerDisplayView {
  const { control, defaultView, tabletOverride, rotateView } = input;
  if (control === "lounge") return "lounge";
  if (control === "timeline") return "timeline";
  if (control === "rotate") {
    return normalizeCustomerDisplayView(rotateView, DEFAULT_CUSTOMER_VIEW);
  }
  return (
    tabletOverride ??
    normalizeCustomerDisplayView(defaultView, DEFAULT_CUSTOMER_VIEW)
  );
}
