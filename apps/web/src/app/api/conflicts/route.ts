import { resolveConflictSchema } from "@zentralab/shared";
import { AuthError, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { nextServerVersion } from "@/lib/inventory";

export async function OPTIONS(req: Request) {
  return optionsResponse(req);
}

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req, ["owner", "staff"]);
    const conflicts = await prisma.syncConflict.findMany({
      where: { storeId: user.storeId },
      orderBy: { createdAt: "desc" },
    });
    return jsonWithCors(req, { conflicts });
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 500;
    return jsonWithCors(
      req,
      { error: e instanceof Error ? e.message : "Error" },
      { status }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req, ["owner", "staff"]);
    const body = resolveConflictSchema.parse(await req.json());
    const conflict = await prisma.syncConflict.findFirst({
      where: { id: body.conflictId, storeId: user.storeId },
    });
    if (!conflict) {
      return jsonWithCors(req, { error: "Not found" }, { status: 404 });
    }
    if (typeof body.adjustOnHandTo === "number" && conflict.productId) {
      await prisma.inventory.update({
        where: { productId: conflict.productId },
        data: {
          onHand: body.adjustOnHandTo,
          version: { increment: 1 },
        },
      });
      await prisma.stockMovement.create({
        data: {
          storeId: user.storeId,
          productId: conflict.productId,
          type: "adjust",
          qty: 0,
          reason: `Conflict resolution: ${body.resolution}`,
        },
      });
    }
    const updated = await prisma.syncConflict.update({
      where: { id: conflict.id },
      data: {
        status: "resolved",
        resolution: body.resolution,
        resolvedAt: new Date(),
      },
    });
    await nextServerVersion();
    return jsonWithCors(req, { conflict: updated });
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 400;
    return jsonWithCors(
      req,
      { error: e instanceof Error ? e.message : "Error" },
      { status }
    );
  }
}
