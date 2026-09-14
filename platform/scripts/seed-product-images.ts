/**
 * Upsert hair-salon retail products with images.
 * Run: pnpm exec tsx scripts/seed-product-images.ts
 * Optional: SALON_SLUG=fhsalon pnpm exec tsx scripts/seed-product-images.ts
 *
 * Catalog lives in src/lib/hair-salon-defaults.ts (Hair salon defaults).
 */
import { PrismaClient } from "@prisma/client";
import { seedHairSalonProducts } from "../src/lib/hair-salon-defaults";

const prisma = new PrismaClient();

async function main() {
  const slug = (process.env.SALON_SLUG || "fhsalon").trim();
  const salon = await prisma.salon.findFirst({
    where: { slug },
    select: { id: true, name: true },
  });
  if (!salon) throw new Error(`Salon ${slug} not found`);

  const count = await seedHairSalonProducts(prisma, salon.id, { strict: false });
  console.log(`Done. ${count} product(s) for ${salon.name} (${slug}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
