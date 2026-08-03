import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const salon = await prisma.salon.findFirst({ where: { slug: "fhsalon" } });
  if (!salon) throw new Error("Salon fhsalon not found");

  const stylists = await prisma.stylist.findMany({
    where: { salonId: salon.id, active: true },
    select: { id: true, name: true },
  });
  const services = await prisma.service.findMany({
    where: { salonId: salon.id, active: true },
    select: { id: true, name: true },
  });

  const data = stylists.flatMap((stylist) =>
    services.map((service) => ({ stylistId: stylist.id, serviceId: service.id }))
  );

  const result = await prisma.stylistService.createMany({
    data,
    skipDuplicates: true,
  });

  console.log(
    JSON.stringify(
      {
        stylists: stylists.map((s) => s.name),
        services: services.map((s) => s.name),
        newLinks: result.count,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
