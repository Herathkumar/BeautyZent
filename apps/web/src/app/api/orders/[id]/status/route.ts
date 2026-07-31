import { AuthError, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { nextServerVersion } from "@/lib/inventory";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["fulfilled", "completed", "cancelled"]),
});

export async function OPTIONS(req: Request) {
  return optionsResponse(req);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req, ["owner", "cashier", "staff"]);
    const { id } = await params;
    const body = schema.parse(await req.json());
    const order = await prisma.order.findFirst({
      where: { id, storeId: user.storeId },
      include: { lines: true },
    });
    if (!order) {
      return jsonWithCors(req, { error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (body.status === "fulfilled" || body.status === "completed") {
        if (order.status === "reserved" || order.status === "paid") {
          for (const line of order.lines) {
            const inv = await tx.inventory.findUnique({
              where: { productId: line.productId },
            });
            if (!inv) continue;
            await tx.inventory.update({
              where: { id: inv.id },
              data: {
                reserved: { decrement: line.qty },
                onHand: { decrement: line.qty },
                version: { increment: 1 },
              },
            });
            await tx.stockMovement.create({
              data: {
                storeId: user.storeId,
                productId: line.productId,
                type: "fulfill",
                qty: -line.qty,
                reason: "Online order fulfilled",
                orderId: order.id,
              },
            });
          }
        }
      }
      if (body.status === "cancelled" && (order.status === "reserved" || order.status === "paid")) {
        for (const line of order.lines) {
          const inv = await tx.inventory.findUnique({
            where: { productId: line.productId },
          });
          if (!inv) continue;
          await tx.inventory.update({
            where: { id: inv.id },
            data: {
              reserved: { decrement: line.qty },
              version: { increment: 1 },
            },
          });
          await tx.stockMovement.create({
            data: {
              storeId: user.storeId,
              productId: line.productId,
              type: "release",
              qty: line.qty,
              reason: "Online order cancelled",
              orderId: order.id,
            },
          });
        }
      }
      return tx.order.update({
        where: { id: order.id },
        data: { status: body.status, version: { increment: 1 } },
        include: { lines: true },
      });
    });

    await nextServerVersion();
    return jsonWithCors(req, { order: updated });
  } catch (e) {
    const statusCode = e instanceof AuthError ? e.status : 400;
    return jsonWithCors(
      req,
      { error: e instanceof Error ? e.message : "Error" },
      { status: statusCode }
    );
  }
}
