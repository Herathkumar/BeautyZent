import { prisma } from "./prisma";
import { calcTax } from "@zentralab/shared";

export function available(onHand: number, reserved: number) {
  return onHand - reserved;
}

export async function nextServerVersion() {
  const meta = await prisma.syncMeta.upsert({
    where: { id: "global" },
    create: { id: "global", serverVersion: 1 },
    update: { serverVersion: { increment: 1 } },
  });
  return meta.serverVersion;
}

export async function createPosSale(input: {
  storeId: string;
  deviceId: string;
  clientOrderId: string;
  lines: Array<{ productId: string; qty: number; unitPriceCents?: number }>;
  tenderType: "cash" | "card_external";
  amountTenderedCents?: number;
  offlineCreatedAt?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({
      where: {
        storeId_clientOrderId: {
          storeId: input.storeId,
          clientOrderId: input.clientOrderId,
        },
      },
      include: { lines: true },
    });
    if (existing) return { order: existing, created: false, conflicts: [] as string[] };

    const conflicts: string[] = [];
    let subtotal = 0;
    let tax = 0;
    const lineRows: Array<{
      productId: string;
      sku: string;
      name: string;
      qty: number;
      unitPriceCents: number;
      taxBps: number;
      lineTotalCents: number;
    }> = [];

    for (const line of input.lines) {
      const product = await tx.product.findFirst({
        where: { id: line.productId, storeId: input.storeId, active: true },
        include: { inventory: true },
      });
      if (!product || !product.inventory) {
        throw new Error(`Product not found: ${line.productId}`);
      }

      const unit = line.unitPriceCents ?? product.priceCents;
      const lineTotal = unit * line.qty;
      const lineTax = calcTax(lineTotal, product.taxBps);
      subtotal += lineTotal;
      tax += lineTax;

      const inv = product.inventory;
      const nextOnHand = inv.onHand - line.qty;
      if (nextOnHand < 0) {
        conflicts.push(
          `Oversold ${product.sku}: on hand ${inv.onHand}, sold ${line.qty}`
        );
        await tx.syncConflict.create({
          data: {
            storeId: input.storeId,
            productId: product.id,
            entityId: product.id,
            message: `Offline/POS oversell on ${product.sku}. onHand became ${nextOnHand}.`,
            onHand: nextOnHand,
            status: "open",
          },
        });
      }

      await tx.inventory.update({
        where: { id: inv.id },
        data: {
          onHand: nextOnHand,
          version: { increment: 1 },
        },
      });

      await tx.stockMovement.create({
        data: {
          storeId: input.storeId,
          productId: product.id,
          type: "sale",
          qty: -line.qty,
          reason: "POS sale",
          deviceId: input.deviceId,
        },
      });

      lineRows.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        qty: line.qty,
        unitPriceCents: unit,
        taxBps: product.taxBps,
        lineTotalCents: lineTotal,
      });
    }

    const order = await tx.order.create({
      data: {
        storeId: input.storeId,
        clientOrderId: input.clientOrderId,
        channel: "pos",
        status: "completed",
        subtotalCents: subtotal,
        taxCents: tax,
        totalCents: subtotal + tax,
        tenderType: input.tenderType,
        amountTenderedCents: input.amountTenderedCents,
        deviceId: input.deviceId,
        createdAt: input.offlineCreatedAt
          ? new Date(input.offlineCreatedAt)
          : undefined,
        lines: { create: lineRows },
      },
      include: { lines: true },
    });

    await tx.syncMeta.upsert({
      where: { id: "global" },
      create: { id: "global", serverVersion: 1 },
      update: { serverVersion: { increment: 1 } },
    });

    return { order, created: true, conflicts };
  });
}
