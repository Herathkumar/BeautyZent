import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { salon: { slug: "fhsalon" } },
    orderBy: { name: "asc" },
    select: {
      name: true,
      active: true,
      priceCents: true,
      imageMime: true,
      imageUpdatedAt: true,
    },
  });
  for (const p of products) {
    const img = p.imageUpdatedAt && p.imageMime ? "IMG" : "---";
    console.log(
      `${p.active ? "ON " : "OFF"} | ${img} | ${p.name} | $${(p.priceCents / 100).toFixed(2)}`
    );
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
