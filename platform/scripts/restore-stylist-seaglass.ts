/**
 * Point every salon stylist pack back to seaglass green (undo legacy "zent" gold).
 *
 *   pnpm exec tsx scripts/with-marketplace-env.ts tsx scripts/restore-stylist-seaglass.ts
 *   # or local DB:
 *   pnpm exec tsx scripts/with-local-env.ts tsx scripts/restore-stylist-seaglass.ts
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const flipped = await prisma.salon.updateMany({
    where: { stylistThemeId: "zent" },
    data: { stylistThemeId: "seaglass" },
  });
  const salons = await prisma.salon.findMany({
    select: { slug: true, stylistThemeId: true },
    orderBy: { slug: "asc" },
  });
  console.log(`Updated ${flipped.count} salon(s) from zent → seaglass`);
  console.table(salons);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
