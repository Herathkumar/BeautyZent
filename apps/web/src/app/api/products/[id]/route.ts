import { productInputSchema } from "@zentralab/shared";
import { AuthError, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { nextServerVersion } from "@/lib/inventory";

export async function OPTIONS(req: Request) {
  return optionsResponse(req);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req, ["owner", "staff"]);
    const { id } = await params;
    const body = productInputSchema.parse(await req.json());
    const existing = await prisma.product.findFirst({
      where: { id, storeId: user.storeId },
    });
    if (!existing) {
      return jsonWithCors(req, { error: "Not found" }, { status: 404 });
    }
    const product = await prisma.product.update({
      where: { id },
      data: {
        sku: body.sku,
        barcode: body.barcode ?? null,
        name: body.name,
        description: body.description ?? null,
        priceCents: body.priceCents,
        taxBps: body.taxBps,
        active: body.active,
        version: { increment: 1 },
        inventory: {
          update: {
            reorderPoint: body.reorderPoint,
            ...(typeof body.onHand === "number" ? { onHand: body.onHand } : {}),
            version: { increment: 1 },
          },
        },
      },
      include: { inventory: true },
    });
    await nextServerVersion();
    return jsonWithCors(req, { product });
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 400;
    return jsonWithCors(
      req,
      { error: e instanceof Error ? e.message : "Error" },
      { status }
    );
  }
}
