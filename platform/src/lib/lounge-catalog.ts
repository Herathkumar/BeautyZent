import { prisma } from "@/lib/prisma";
import { productImageUrl } from "@/lib/product-image";
import { salonLookImageUrl } from "@/lib/salon-looks";
import { listActiveSalonLooks } from "@/lib/salon-look-db";

export type LoungeCatalogProduct = {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  priceCents: number;
  stockQty: number;
  hasImage: boolean;
  imageUrl: string | null;
};

export type LoungeCatalogLook = {
  id: string;
  styleNumber: number;
  title: string;
  category: string;
  description: string | null;
  beforeUrl: string | null;
  afterUrl: string | null;
};

/** Server-side lounge catalog (bypasses display PIN — images are already public). */
export async function loadLoungeCatalog(slug: string): Promise<{
  products: LoungeCatalogProduct[];
  looks: LoungeCatalogLook[];
}> {
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!salon) return { products: [], looks: [] };

  const [products, looks] = await Promise.all([
    prisma.product.findMany({
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
      take: 24,
    }),
    listActiveSalonLooks(salon.id),
  ]);

  return {
    products: products
      .map((p) => {
        const hasImage = Boolean(p.imageMime);
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
      })
      .filter((p) => p.hasImage && p.imageUrl),
    looks: looks.map((look) => {
      const hasBefore = Boolean(look.beforeMime);
      const hasAfter = Boolean(look.afterMime);
      return {
        id: look.id,
        styleNumber: look.styleNumber,
        title: look.title,
        category: look.category,
        description: look.description,
        beforeUrl: salonLookImageUrl({
          id: look.id,
          side: "before",
          hasImage: hasBefore,
          updatedAt: look.updatedAt,
        }),
        afterUrl: salonLookImageUrl({
          id: look.id,
          side: "after",
          hasImage: hasAfter,
          updatedAt: look.updatedAt,
        }),
      };
    }),
  };
}
