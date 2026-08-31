/** Fixed customer TV surfaces — separate Lounge and Scheduler apps. */

export type StoreDisplaySurface = "lounge" | "scheduler";

export function normalizeStoreDisplaySurface(
  value: unknown,
  fallback: StoreDisplaySurface = "lounge"
): StoreDisplaySurface {
  return value === "scheduler" || value === "timeline" ? "scheduler" : value === "lounge" ? "lounge" : fallback;
}

/** Map surface → DisplayBoard fixed view. */
export function surfaceToCustomerView(surface: StoreDisplaySurface): "lounge" | "timeline" {
  return surface === "scheduler" ? "timeline" : "lounge";
}

export function pickEnabledDisplayRedirect(salon: {
  loungeDisplayEnabled?: boolean | null;
  schedulerDisplayEnabled?: boolean | null;
}): StoreDisplaySurface | null {
  const lounge = salon.loungeDisplayEnabled !== false;
  const scheduler = salon.schedulerDisplayEnabled !== false;
  if (lounge) return "lounge";
  if (scheduler) return "scheduler";
  return null;
}
