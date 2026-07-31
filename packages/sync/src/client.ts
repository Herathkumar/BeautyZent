import type { SyncEvent } from "./types";

export interface SyncPushResult {
  accepted: string[];
  conflicts: Array<{
    eventId: string;
    entityId: string;
    message: string;
    onHand?: number;
  }>;
  serverVersion: number;
}

export interface SyncPullResult {
  products: unknown[];
  inventory: unknown[];
  orders: unknown[];
  serverVersion: number;
}

export async function pushSyncEvents(
  apiBase: string,
  token: string,
  body: { deviceId: string; storeId: string; events: SyncEvent[] }
): Promise<SyncPushResult> {
  const res = await fetch(`${apiBase}/api/sync/push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      deviceId: body.deviceId,
      storeId: body.storeId,
      events: body.events.map(({ status: _s, ...e }) => e),
    }),
  });
  if (!res.ok) {
    throw new Error(`Sync push failed: ${res.status}`);
  }
  return res.json();
}

export async function pullSyncEvents(
  apiBase: string,
  token: string,
  storeId: string,
  sinceVersion: number
): Promise<SyncPullResult> {
  const url = new URL(`${apiBase}/api/sync/pull`);
  url.searchParams.set("storeId", storeId);
  url.searchParams.set("sinceVersion", String(sinceVersion));
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Sync pull failed: ${res.status}`);
  }
  return res.json();
}
