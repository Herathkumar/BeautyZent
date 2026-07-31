import type { SyncEntityType } from "@zentralab/shared";

export interface SyncEvent {
  id: string;
  entityType: SyncEntityType;
  entityId: string;
  op: "create" | "update";
  version: number;
  payload: Record<string, unknown>;
  createdAt: string;
  status: "pending" | "synced" | "failed";
}

export interface LocalProduct {
  id: string;
  storeId: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  priceCents: number;
  taxBps: number;
  active: boolean;
  version: number;
  updatedAt: string;
}

export interface LocalInventory {
  id: string;
  storeId: string;
  productId: string;
  onHand: number;
  reserved: number;
  reorderPoint: number;
  version: number;
  updatedAt: string;
}

export interface LocalOrder {
  id: string;
  clientOrderId: string;
  storeId: string;
  channel: "pos" | "online";
  status: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  tenderType: string | null;
  linesJson: string;
  createdAt: string;
  synced: boolean;
  version: number;
}

export type SyncStatus = "online" | "offline" | "syncing";
