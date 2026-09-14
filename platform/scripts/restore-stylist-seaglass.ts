/**
 * Force every salon’s stylist pack to seaglass green.
 *
 *   pnpm exec tsx scripts/with-marketplace-env.ts tsx scripts/restore-stylist-seaglass.ts
 *   pnpm exec tsx scripts/with-local-env.ts tsx scripts/restore-stylist-seaglass.ts
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const flipped = await prisma.salon.updateMany({
    where: { NOT: { stylistThemeId: "seaglass" } },
    data: { stylistThemeId: "seaglass" },
  });
  const salons = await prisma.salon.findMany({
    select: { slug: true, stylistThemeId: true },
    orderBy: { slug: "asc" },
  });
  console.log(`Set stylistThemeId=seaglass on ${flipped.count} salon(s)`);
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
