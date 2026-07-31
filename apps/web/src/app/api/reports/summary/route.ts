import { AuthError, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { available } from "@/lib/inventory";

export async function OPTIONS(req: Request) {
  return optionsResponse(req);
}

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req, ["owner", "staff", "cashier"]);
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const [orders, inventory, openConflicts] = await Promise.all([
      prisma.order.findMany({
        where: {
          storeId: user.storeId,
          createdAt: { gte: start },
          status: { in: ["completed", "paid", "fulfilled", "reserved"] },
        },
      }),
      prisma.inventory.findMany({
        where: { storeId: user.storeId },
        include: { product: true },
      }),
      prisma.syncConflict.count({
        where: { storeId: user.storeId, status: "open" },
      }),
    ]);

    const salesCents = orders
      .filter((o) => ["completed", "paid", "fulfilled"].includes(o.status))
      .reduce((s, o) => s + o.totalCents, 0);

    const lowStock = inventory
      .filter((i) => available(i.onHand, i.reserved) <= i.reorderPoint)
      .map((i) => ({
        sku: i.product.sku,
        name: i.product.name,
        available: available(i.onHand, i.reserved),
        reorderPoint: i.reorderPoint,
      }));

    return jsonWithCors(req, {
      today: {
        orderCount: orders.length,
        salesCents,
        posCount: orders.filter((o) => o.channel === "pos").length,
        onlineCount: orders.filter((o) => o.channel === "online").length,
      },
      lowStock,
      openConflicts,
    });
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 500;
    return jsonWithCors(
      req,
      { error: e instanceof Error ? e.message : "Error" },
      { status }
    );
  }
}
