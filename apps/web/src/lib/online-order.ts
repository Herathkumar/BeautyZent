import { calcTax } from "@zentralab/shared";
import { prisma } from "./prisma";
import { available, nextServerVersion } from "./inventory";

export async function createOnlineReservation(input: {
  storeSlug: string;
  customerName: string;
  customerEmail: string;
  lines: Array<{ productId: string; qty: number }>;
}) {
  const store = await prisma.store.findUnique({ where: { slug: input.storeSlug } });
  if (!store) throw new Error("Store not found");

  return prisma.$transaction(async (tx) => {
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
        where: { id: line.productId, storeId: store.id, active: true },
        include: { inventory: true },
      });
      if (!product?.inventory) throw new Error(`Product unavailable: ${line.productId}`);
      const avail = available(product.inventory.onHand, product.inventory.reserved);
      if (line.qty > avail) {
        throw new Error(
          `Insufficient stock for ${product.sku}: available ${avail}, requested ${line.qty}`
        );
      }
      const lineTotal = product.priceCents * line.qty;
      const lineTax = calcTax(lineTotal, product.taxBps);
      subtotal += lineTotal;
      tax += lineTax;
      await tx.inventory.update({
        where: { id: product.inventory.id },
        data: {
          reserved: { increment: line.qty },
          version: { increment: 1 },
        },
      });
      await tx.stockMovement.create({
        data: {
          storeId: store.id,
          productId: product.id,
          type: "reserve",
          qty: line.qty,
          reason: "Online order reserve",
        },
      });
      lineRows.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        qty: line.qty,
        unitPriceCents: product.priceCents,
        taxBps: product.taxBps,
        lineTotalCents: lineTotal,
      });
    }

    const order = await tx.order.create({
      data: {
        storeId: store.id,
        channel: "online",
        status: "reserved",
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        subtotalCents: subtotal,
        taxCents: tax,
        totalCents: subtotal + tax,
        tenderType: "stripe",
        lines: { create: lineRows },
      },
      include: { lines: true },
    });

    return { store, order };
  }).then(async (result) => {
    await nextServerVersion();
    return result;
  });
}
