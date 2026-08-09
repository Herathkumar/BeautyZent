import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const services = await prisma.service.findMany({
    where: { salon: { slug: "fhsalon" } },
    orderBy: [{ active: "desc" }, { category: "asc" }, { name: "asc" }],
    select: {
      name: true,
      category: true,
      active: true,
      imageMime: true,
      imageUpdatedAt: true,
    },
  });
  for (const s of services) {
    const has = Boolean(s.imageUpdatedAt && s.imageMime);
    const on = s.active ? "ON " : "OFF";
    const img = has ? "IMG" : "---";
    console.log(`${on} | ${img} | ${s.category.padEnd(6)} | ${s.name}`);
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
