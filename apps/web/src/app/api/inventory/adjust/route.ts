import { stockAdjustSchema } from "@zentralab/shared";
import { AuthError, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { nextServerVersion } from "@/lib/inventory";

export async function OPTIONS(req: Request) {
  return optionsResponse(req);
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req, ["owner", "staff"]);
    const body = stockAdjustSchema.parse(await req.json());
    const inv = await prisma.inventory.findFirst({
      where: { productId: body.productId, storeId: user.storeId },
    });
    if (!inv) {
      return jsonWithCors(req, { error: "Inventory not found" }, { status: 404 });
    }
    const updated = await prisma.inventory.update({
      where: { id: inv.id },
      data: {
        onHand: { increment: body.delta },
        version: { increment: 1 },
      },
      include: { product: true },
    });
    await prisma.stockMovement.create({
      data: {
        storeId: user.storeId,
        productId: body.productId,
        type: body.type,
        qty: body.delta,
        reason: body.reason,
      },
    });
    await nextServerVersion();
    return jsonWithCors(req, { inventory: updated });
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 400;
    return jsonWithCors(
      req,
      { error: e instanceof Error ? e.message : "Error" },
      { status }
    );
  }
}
