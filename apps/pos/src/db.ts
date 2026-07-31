import Dexie, { type Table } from "dexie";
import type {
  LocalInventory,
  LocalOrder,
  LocalProduct,
  SyncEvent,
} from "@zentralab/sync";

export interface MetaRow {
  key: string;
  value: string;
}

class PosDb extends Dexie {
  products!: Table<LocalProduct, string>;
  inventory!: Table<LocalInventory, string>;
  orders!: Table<LocalOrder, string>;
  outbox!: Table<SyncEvent, string>;
  onlineOrders!: Table<Record<string, unknown>, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super("zentralab-pos");
    this.version(1).stores({
      products: "id, storeId, sku, barcode, name",
      inventory: "id, storeId, productId",
      orders: "id, clientOrderId, storeId, synced",
      outbox: "id, status, createdAt",
      onlineOrders: "id, status",
      meta: "key",
    });
  }
}

export const db = new PosDb();

export async function getMeta(key: string, fallback = "") {
  const row = await db.meta.get(key);
  return row?.value ?? fallback;
}

export async function setMeta(key: string, value: string) {
  await db.meta.put({ key, value });
}

export function getDeviceId() {
  const key = "zl_device_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}
