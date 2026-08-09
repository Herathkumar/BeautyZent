import { NextResponse } from "next/server";
import { assertDisplayAccess } from "@/lib/display-pin";
import { prisma } from "@/lib/prisma";
import { productImageUrl } from "@/lib/product-image";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      displayPinHash: true,
      displayPinSetAt: true,
    },
  });
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  const locked = await assertDisplayAccess(salon);
  if (locked) return locked;

  const products = await prisma.product.findMany({
    where: { salonId: salon.id, active: true },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      sku: true,
      priceCents: true,
      stockQty: true,
      imageMime: true,
      imageUpdatedAt: true,
    },
  });

  return NextResponse.json({
    salon: { id: salon.id, slug: salon.slug, name: salon.name },
    products: products.map((p) => {
      const hasImage = Boolean(p.imageUpdatedAt && p.imageMime);
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        sku: p.sku,
        priceCents: p.priceCents,
        stockQty: p.stockQty,
        hasImage,
        imageUrl: productImageUrl({
          id: p.id,
          hasImage,
          imageUpdatedAt: p.imageUpdatedAt,
        }),
      };
    }),
  });
}
