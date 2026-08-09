import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const salon = await prisma.salon.findFirst({ where: { slug: "fhsalon" } });
  if (!salon) throw new Error("Salon fhsalon not found");

  for (const name of ["Men's haircut", "Women's haircut"]) {
    const row = await prisma.service.updateMany({
      where: { salonId: salon.id, name },
      data: { active: true },
    });
    console.log(`Activated ${name}: ${row.count}`);
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
