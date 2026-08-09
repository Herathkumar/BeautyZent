/**
 * Fix known service name typos for fhsalon.
 * Run: pnpm exec tsx scripts/fix-service-name-typos.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const RENAMES: Array<{
  from: string;
  to: string;
  category?: string;
}> = [
  { from: "Hair coluring", to: "Hair coloring" },
  { from: "Eye brow trimming", to: "Eyebrow trimming" },
  { from: "Men's hair cut", to: "Men's haircut" },
  { from: "Women's hair cut", to: "Women's haircut", category: "WOMEN" },
];

async function main() {
  const salon = await prisma.salon.findFirst({ where: { slug: "fhsalon" } });
  if (!salon) throw new Error("Salon fhsalon not found");

  for (const fix of RENAMES) {
    const row = await prisma.service.findFirst({
      where: { salonId: salon.id, name: fix.from },
      select: { id: true, name: true, category: true },
    });
    if (!row) {
      console.log(`Skip (not found): ${fix.from}`);
      continue;
    }

    const clash = await prisma.service.findFirst({
      where: {
        salonId: salon.id,
        name: fix.to,
        NOT: { id: row.id },
      },
      select: { id: true, name: true },
    });
    if (clash) {
      // Prefer keeping the correctly named row; retire the typo duplicate.
      await prisma.service.update({
        where: { id: row.id },
        data: { active: false, name: `${fix.from} (duplicate)` },
      });
      console.log(
        `Deactivated duplicate typo "${fix.from}" — kept existing "${fix.to}"`
      );
      continue;
    }

    await prisma.service.update({
      where: { id: row.id },
      data: {
        name: fix.to,
        ...(fix.category ? { category: fix.category } : {}),
      },
    });
    console.log(
      `Renamed: "${fix.from}" → "${fix.to}"` +
        (fix.category ? ` (${fix.category})` : "")
    );
  }

  const services = await prisma.service.findMany({
    where: { salonId: salon.id, active: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: { category: true, name: true },
  });
  console.log("\nActive services:");
  for (const s of services) {
    console.log(`  ${s.category.padEnd(6)} ${s.name}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
