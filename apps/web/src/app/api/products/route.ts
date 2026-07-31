import { productInputSchema } from "@zentralab/shared";
import { AuthError, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { nextServerVersion } from "@/lib/inventory";

export async function OPTIONS(req: Request) {
  return optionsResponse(req);
}

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim();
    const products = await prisma.product.findMany({
      where: {
        storeId: user.storeId,
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { sku: { contains: q } },
                { barcode: { contains: q } },
              ],
            }
          : {}),
      },
      include: { inventory: true },
      orderBy: { name: "asc" },
    });
    return jsonWithCors(req, { products });
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
    const body = productInputSchema.parse(await req.json());
    const product = await prisma.product.create({
      data: {
        storeId: user.storeId,
        sku: body.sku,
        barcode: body.barcode ?? null,
        name: body.name,
        description: body.description ?? null,
        priceCents: body.priceCents,
        taxBps: body.taxBps,
        active: body.active,
        inventory: {
          create: {
            storeId: user.storeId,
            onHand: body.onHand ?? 0,
            reserved: 0,
            reorderPoint: body.reorderPoint,
          },
        },
      },
      include: { inventory: true },
    });
    await nextServerVersion();
    return jsonWithCors(req, { product }, { status: 201 });
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 400;
    return jsonWithCors(
      req,
      { error: e instanceof Error ? e.message : "Error" },
      { status }
    );
  }
}
