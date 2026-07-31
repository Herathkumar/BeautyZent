import { AuthError, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonWithCors, optionsResponse } from "@/lib/cors";

export async function OPTIONS(req: Request) {
  return optionsResponse(req);
}

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    const url = new URL(req.url);
    const storeId = url.searchParams.get("storeId") ?? user.storeId;
    if (storeId !== user.storeId) {
      return jsonWithCors(req, { error: "Store mismatch" }, { status: 403 });
    }
    const sinceVersion = Number(url.searchParams.get("sinceVersion") ?? "0");

    const products = await prisma.product.findMany({
      where: { storeId },
      include: { inventory: true },
    });
    const inventory = await prisma.inventory.findMany({ where: { storeId } });
    const orders = await prisma.order.findMany({
      where: {
        storeId,
        OR: [
          { channel: "online", status: { in: ["reserved", "paid"] } },
          { updatedAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24) } },
        ],
      },
      include: { lines: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const meta = await prisma.syncMeta.findUnique({ where: { id: "global" } });
    return jsonWithCors(req, {
      products,
      inventory,
      orders,
      serverVersion: meta?.serverVersion ?? sinceVersion,
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
