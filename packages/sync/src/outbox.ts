import type { SyncEvent } from "./types";

export function createOutboxEvent(
  partial: Omit<SyncEvent, "status" | "createdAt"> & { createdAt?: string }
): SyncEvent {
  return {
    ...partial,
    createdAt: partial.createdAt ?? new Date().toISOString(),
    status: "pending",
  };
}

export function sortPending(events: SyncEvent[]): SyncEvent[] {
  return [...events]
    .filter((e) => e.status === "pending")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function availableStock(onHand: number, reserved: number): number {
  return onHand - reserved;
}

export function applyLocalSale(
  onHand: number,
  qty: number
): { onHand: number; oversold: boolean } {
  const next = onHand - qty;
  return { onHand: next, oversold: next < 0 };
}
