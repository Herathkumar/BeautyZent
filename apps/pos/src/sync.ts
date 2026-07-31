import { createOutboxEvent, pullSyncEvents, pushSyncEvents } from "@zentralab/sync";
import type { SyncStatus } from "@zentralab/sync";
import { calcTax, formatMoney } from "@zentralab/shared";
import { API, api, getToken } from "./api";
import { db, getDeviceId, getMeta, setMeta } from "./db";

export type CartLine = {
  productId: string;
  sku: string;
  name: string;
  qty: number;
  unitPriceCents: number;
  taxBps: number;
};

export async function hydrateFromServer() {
  const me = await api<{
    user: { storeId: string; name: string; email: string; role: string };
    store: { id: string; name: string; currency: string };
  }>("/api/auth/me");
  localStorage.setItem("zl_user", JSON.stringify(me.user));
  localStorage.setItem("zl_store", JSON.stringify(me.store));

  const pull = await pullSyncEvents(API, getToken(), me.user.storeId, 0);
  await db.transaction("rw", db.products, db.inventory, db.onlineOrders, async () => {
    await db.products.clear();
    await db.inventory.clear();
    for (const p of pull.products as Array<Record<string, unknown>>) {
      const inv = p.inventory as Record<string, unknown> | null;
      await db.products.put({
        id: String(p.id),
        storeId: String(p.storeId),
        sku: String(p.sku),
        barcode: (p.barcode as string | null) ?? null,
        name: String(p.name),
        description: (p.description as string | null) ?? null,
        priceCents: Number(p.priceCents),
        taxBps: Number(p.taxBps),
        active: Boolean(p.active),
        version: Number(p.version ?? 1),
        updatedAt: String(p.updatedAt ?? new Date().toISOString()),
      });
      if (inv) {
        await db.inventory.put({
          id: String(inv.id),
          storeId: String(inv.storeId),
          productId: String(inv.productId),
          onHand: Number(inv.onHand),
          reserved: Number(inv.reserved),
          reorderPoint: Number(inv.reorderPoint),
          version: Number(inv.version ?? 1),
          updatedAt: String(inv.updatedAt ?? new Date().toISOString()),
        });
      }
    }
    await db.onlineOrders.clear();
    for (const o of pull.orders as Array<Record<string, unknown>>) {
      if (o.channel === "online") {
        await db.onlineOrders.put({ ...o, id: String(o.id) });
      }
    }
  });
  await setMeta("serverVersion", String(pull.serverVersion));
  await setMeta("storeId", me.user.storeId);
  return me;
}

export async function runSync(onStatus?: (s: SyncStatus) => void): Promise<{
  conflicts: Array<{ message: string }>;
}> {
  if (!navigator.onLine) {
    onStatus?.("offline");
    return { conflicts: [] };
  }
  onStatus?.("syncing");
  const storeId = await getMeta("storeId");
  const deviceId = getDeviceId();
  const pending = await db.outbox.where("status").equals("pending").toArray();

  let conflicts: Array<{ message: string }> = [];
  if (pending.length) {
    const result = await pushSyncEvents(API, getToken(), {
      deviceId,
      storeId,
      events: pending,
    });
    conflicts = result.conflicts.map((c) => ({ message: c.message }));
    await db.transaction("rw", db.outbox, db.orders, async () => {
      for (const id of result.accepted) {
        await db.outbox.update(id, { status: "synced" });
      }
      const unsynced = await db.orders.filter((o) => !o.synced).toArray();
      for (const o of unsynced) {
        await db.orders.update(o.id, { synced: true });
      }
    });
    await setMeta("serverVersion", String(result.serverVersion));
  }

  await hydrateFromServer();
  onStatus?.("online");
  return { conflicts };
}

export async function completeSale(input: {
  lines: CartLine[];
  tenderType: "cash" | "card_external";
  amountTenderedCents?: number;
}) {
  const storeId = await getMeta("storeId");
  const deviceId = getDeviceId();
  const clientOrderId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  let subtotal = 0;
  let tax = 0;
  for (const line of input.lines) {
    const lt = line.unitPriceCents * line.qty;
    subtotal += lt;
    tax += calcTax(lt, line.taxBps);
  }
  const total = subtotal + tax;

  await db.transaction("rw", db.inventory, db.orders, db.outbox, async () => {
    for (const line of input.lines) {
      const inv = await db.inventory.where("productId").equals(line.productId).first();
      if (inv) {
        await db.inventory.update(inv.id, {
          onHand: inv.onHand - line.qty,
          version: inv.version + 1,
          updatedAt: createdAt,
        });
      }
    }

    await db.orders.put({
      id: clientOrderId,
      clientOrderId,
      storeId,
      channel: "pos",
      status: "completed",
      subtotalCents: subtotal,
      taxCents: tax,
      totalCents: total,
      tenderType: input.tenderType,
      linesJson: JSON.stringify(input.lines),
      createdAt,
      synced: false,
      version: 1,
    });

    const event = createOutboxEvent({
      id: crypto.randomUUID(),
      entityType: "order",
      entityId: clientOrderId,
      op: "create",
      version: 1,
      createdAt,
      payload: {
        kind: "pos_sale",
        clientOrderId,
        lines: input.lines.map((l) => ({
          productId: l.productId,
          qty: l.qty,
          unitPriceCents: l.unitPriceCents,
        })),
        tenderType: input.tenderType,
        amountTenderedCents: input.amountTenderedCents,
      },
    });
    await db.outbox.put(event);
  });

  const receipt = buildReceipt({
    clientOrderId,
    lines: input.lines,
    subtotal,
    tax,
    total,
    tenderType: input.tenderType,
    amountTenderedCents: input.amountTenderedCents,
    createdAt,
  });

  if (navigator.onLine) {
    try {
      await runSync();
    } catch {
      // stay offline-queued
    }
  }

  return { clientOrderId, subtotal, tax, total, receipt };
}

export function buildReceipt(input: {
  clientOrderId: string;
  lines: CartLine[];
  subtotal: number;
  tax: number;
  total: number;
  tenderType: string;
  amountTenderedCents?: number;
  createdAt: string;
}) {
  const store = JSON.parse(localStorage.getItem("zl_store") || "{}");
  const lines = input.lines
    .map(
      (l) =>
        `${l.qty} x ${l.name}\n  ${formatMoney(l.unitPriceCents)}  ${formatMoney(l.unitPriceCents * l.qty)}`
    )
    .join("\n");
  const change =
    typeof input.amountTenderedCents === "number"
      ? `\nTendered: ${formatMoney(input.amountTenderedCents)}\nChange: ${formatMoney(input.amountTenderedCents - input.total)}`
      : "";
  return `
${store.name ?? "ZentraLab Store"}
POS RECEIPT
${new Date(input.createdAt).toLocaleString()}
Order: ${input.clientOrderId.slice(0, 8)}

${lines}

Subtotal: ${formatMoney(input.subtotal)}
Tax:      ${formatMoney(input.tax)}
TOTAL:    ${formatMoney(input.total)}
Paid:     ${input.tenderType}${change}

Thank you!
`.trim();
}

export async function findProductByScan(code: string) {
  const byBarcode = await db.products.where("barcode").equals(code).first();
  if (byBarcode) return byBarcode;
  const bySku = await db.products.where("sku").equals(code).first();
  if (bySku) return bySku;
  return db.products
    .filter(
      (p) =>
        p.name.toLowerCase().includes(code.toLowerCase()) ||
        p.sku.toLowerCase().includes(code.toLowerCase())
    )
    .first();
}
