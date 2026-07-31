import { prisma } from "@/lib/prisma";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { available } from "@/lib/inventory";

export async function OPTIONS(req: Request) {
  return optionsResponse(req);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const store = await prisma.store.findUnique({ where: { slug } });
  if (!store) {
    return jsonWithCors(req, { error: "Store not found" }, { status: 404 });
  }
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const products = await prisma.product.findMany({
    where: {
      storeId: store.id,
      active: true,
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { sku: { contains: q } },
            ],
          }
        : {}),
    },
    include: { inventory: true },
    orderBy: { name: "asc" },
  });
  return jsonWithCors(req, {
    store: {
      id: store.id,
      name: store.name,
      slug: store.slug,
      currency: store.currency,
      policies: store.policies,
      hours: JSON.parse(store.hoursJson),
    },
    products: products.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      description: p.description,
      priceCents: p.priceCents,
      taxBps: p.taxBps,
      available: p.inventory
        ? available(p.inventory.onHand, p.inventory.reserved)
        : 0,
    })),
  });
}
