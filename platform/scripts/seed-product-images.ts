/**
 * Upsert ~20 salon retail products with images for fhsalon.
 * Run: pnpm exec tsx scripts/seed-product-images.ts
 */
import { readFileSync, existsSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Item = {
  name: string;
  aliases?: string[];
  description: string;
  priceCents: number;
  stockQty: number;
  sku: string;
  file: string;
};

const PRODUCTS: Item[] = [
  {
    name: "Shampoo 250ml",
    aliases: ["Shamoo", "Shampoo"],
    description: "Salon shampoo for daily care",
    priceCents: 1800,
    stockQty: 12,
    sku: "SH-250",
    file: "shampoo.jpg",
  },
  {
    name: "Conditioner 250ml",
    aliases: ["Conditioner"],
    description: "Salon conditioner for soft finish",
    priceCents: 1800,
    stockQty: 10,
    sku: "CD-250",
    file: "conditioner.jpg",
  },
  {
    name: "Hair oil",
    aliases: ["Hair Oil", "Oil"],
    description: "Nourishing finishing oil",
    priceCents: 2200,
    stockQty: 8,
    sku: "OIL-01",
    file: "hair-oil.jpg",
  },
  {
    name: "Hair serum",
    description: "Lightweight shine serum",
    priceCents: 2400,
    stockQty: 10,
    sku: "SR-01",
    file: "hair-serum.jpg",
  },
  {
    name: "Leave-in conditioner",
    description: "Detangle and soften without rinse",
    priceCents: 2000,
    stockQty: 9,
    sku: "LI-01",
    file: "leave-in.jpg",
  },
  {
    name: "Hair mask",
    description: "Deep conditioning weekly mask",
    priceCents: 2800,
    stockQty: 7,
    sku: "MSK-01",
    file: "hair-mask.jpg",
  },
  {
    name: "Dry shampoo",
    description: "Refresh between washes",
    priceCents: 1900,
    stockQty: 11,
    sku: "DS-01",
    file: "dry-shampoo.jpg",
  },
  {
    name: "Styling gel",
    description: "Strong hold with natural shine",
    priceCents: 1600,
    stockQty: 10,
    sku: "GEL-01",
    file: "styling-gel.jpg",
  },
  {
    name: "Hair spray",
    description: "Flexible hold finishing spray",
    priceCents: 1700,
    stockQty: 12,
    sku: "SP-01",
    file: "hair-spray.jpg",
  },
  {
    name: "Volumizing mousse",
    description: "Lift and body for fine hair",
    priceCents: 1800,
    stockQty: 8,
    sku: "MS-01",
    file: "mousse.jpg",
  },
  {
    name: "Curl cream",
    description: "Define curls without crunch",
    priceCents: 2100,
    stockQty: 9,
    sku: "CC-01",
    file: "curl-cream.jpg",
  },
  {
    name: "Heat protectant",
    description: "Shield before blow-dry or iron",
    priceCents: 2000,
    stockQty: 10,
    sku: "HP-01",
    file: "heat-protectant.jpg",
  },
  {
    name: "Beard oil",
    description: "Soften and condition facial hair",
    priceCents: 2200,
    stockQty: 8,
    sku: "BO-01",
    file: "beard-oil.jpg",
  },
  {
    name: "Beard balm",
    description: "Shape and tame the beard",
    priceCents: 2400,
    stockQty: 7,
    sku: "BB-01",
    file: "beard-balm.jpg",
  },
  {
    name: "Pomade",
    description: "Classic hold with shine",
    priceCents: 1900,
    stockQty: 10,
    sku: "PM-01",
    file: "pomade.jpg",
  },
  {
    name: "Matte clay",
    description: "Texture and natural matte finish",
    priceCents: 2000,
    stockQty: 9,
    sku: "CL-01",
    file: "matte-clay.jpg",
  },
  {
    name: "Scalp scrub",
    description: "Exfoliate and refresh the scalp",
    priceCents: 2600,
    stockQty: 6,
    sku: "SC-01",
    file: "scalp-scrub.jpg",
  },
  {
    name: "Argan oil treatment",
    description: "Rich argan oil for dry ends",
    priceCents: 2700,
    stockQty: 7,
    sku: "AR-01",
    file: "argan-oil.jpg",
  },
  {
    name: "Color-protect shampoo",
    description: "Gentle cleanse for colour-treated hair",
    priceCents: 2000,
    stockQty: 8,
    sku: "CPS-01",
    file: "color-shampoo.jpg",
  },
  {
    name: "Keratin serum",
    description: "Smooth and reduce frizz",
    priceCents: 2900,
    stockQty: 6,
    sku: "KS-01",
    file: "keratin-serum.jpg",
  },
  {
    name: "Detangling spray",
    description: "Easy comb-through for wet hair",
    priceCents: 1500,
    stockQty: 11,
    sku: "DT-01",
    file: "detangler.jpg",
  },
  {
    name: "Hair perfume mist",
    description: "Light fragrance finish for hair",
    priceCents: 2500,
    stockQty: 5,
    sku: "HM-01",
    file: "hair-mist.jpg",
  },
  {
    name: "Volume powder",
    description: "Root lift and texture",
    priceCents: 1800,
    stockQty: 8,
    sku: "VP-01",
    file: "volume-powder.jpg",
  },
];

async function main() {
  const dir = path.join(process.cwd(), "prisma", "seed-assets", "product-images");
  const salon = await prisma.salon.findFirst({ where: { slug: "fhsalon" } });
  if (!salon) throw new Error("Salon fhsalon not found");

  let updated = 0;
  for (const item of PRODUCTS) {
    const full = path.join(dir, item.file);
    const imageBytes = existsSync(full) ? readFileSync(full) : null;
    const imageData = imageBytes
      ? {
          imageData: imageBytes,
          imageMime: "image/jpeg" as const,
          imageUpdatedAt: new Date(),
        }
      : {};

    const names = [item.name, ...(item.aliases || [])];
    let existing: { id: string } | null = null;
    for (const n of names) {
      existing = await prisma.product.findFirst({
        where: { salonId: salon.id, name: n },
        select: { id: true },
      });
      if (existing) break;
    }

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          name: item.name,
          description: item.description,
          priceCents: item.priceCents,
          stockQty: item.stockQty,
          sku: item.sku,
          active: true,
          ...imageData,
        },
      });
      console.log(`Updated: ${item.name}${imageBytes ? ` (${imageBytes.length}b)` : " — no image"}`);
    } else {
      await prisma.product.create({
        data: {
          salonId: salon.id,
          name: item.name,
          description: item.description,
          priceCents: item.priceCents,
          stockQty: item.stockQty,
          sku: item.sku,
          active: true,
          ...imageData,
        },
      });
      console.log(`Created: ${item.name}${imageBytes ? ` (${imageBytes.length}b)` : " — no image"}`);
    }
    updated += 1;
  }
  console.log(`Done. ${updated} product(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
