/**
 * Seed numbered salon lookbook styles (before/after) for lounge TV.
 * Run: pnpm exec tsx scripts/seed-salon-looks.ts
 * Optional: SALON_SLUG=aaraby-beauty pnpm exec tsx scripts/seed-salon-looks.ts
 *
 * Hair salon defaults live in src/lib/hair-salon-defaults.ts
 */
import { PrismaClient } from "@prisma/client";
import { seedHairSalonLooks } from "../src/lib/hair-salon-defaults";

const prisma = new PrismaClient();

async function seedSalon(slug: string) {
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { id: true, name: true, businessType: true },
  });
  if (!salon) {
    console.warn(`Skip ${slug}: salon not found`);
    return;
  }
  const count = await seedHairSalonLooks(prisma, salon.id, { strict: true });
  console.log(`Seeded ${count} looks for ${salon.name} (${slug})`);
}

async function main() {
  const only = process.env.SALON_SLUG?.trim();
  const slugs = only ? [only] : ["aaraby-beauty", "fhsalon", "demosalon"];
  for (const slug of slugs) {
    await seedSalon(slug);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
