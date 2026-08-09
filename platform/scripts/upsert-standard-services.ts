/**
 * Upsert standard Farzana services at $20 CAD and set any zero/missing prices to $20.
 * Usage (from platform/): pnpm exec tsx scripts/upsert-standard-services.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DEFAULT_CENTS = 2000;

const STANDARD = [
  { name: "Women's haircut & style", category: "WOMEN", durationMin: 60, sortOrder: 1 },
  { name: "Trim & tidy", category: "WOMEN", durationMin: 30, sortOrder: 2 },
  { name: "Bang / fringe trim", category: "WOMEN", durationMin: 15, sortOrder: 3 },
  { name: "Men's haircut", category: "MEN", durationMin: 30, sortOrder: 4 },
  { name: "Fade / taper", category: "MEN", durationMin: 45, sortOrder: 5 },
  { name: "Beard tidy (with cut)", category: "MEN", durationMin: 15, sortOrder: 6 },
] as const;

async function main() {
  const slug = process.env.NEXT_PUBLIC_DEFAULT_SALON_SLUG || "fhsalon";
  const salon = await prisma.salon.findUnique({ where: { slug } });
  if (!salon) throw new Error(`Salon not found: ${slug}`);

  const stylists = await prisma.stylist.findMany({
    where: { salonId: salon.id, active: true },
    select: { id: true },
  });

  for (const svc of STANDARD) {
    const existing = await prisma.service.findFirst({
      where: { salonId: salon.id, name: svc.name },
    });
    const row = existing
      ? await prisma.service.update({
          where: { id: existing.id },
          data: {
            category: svc.category,
            durationMin: svc.durationMin,
            sortOrder: svc.sortOrder,
            priceCents: DEFAULT_CENTS,
            active: true,
          },
        })
      : await prisma.service.create({
          data: {
            salonId: salon.id,
            ...svc,
            priceCents: DEFAULT_CENTS,
            active: true,
          },
        });
    console.log(existing ? "updated" : "created", svc.name);

    for (const st of stylists) {
      await prisma.stylistService.upsert({
        where: { stylistId_serviceId: { stylistId: st.id, serviceId: row.id } },
        update: {},
        create: { stylistId: st.id, serviceId: row.id },
      });
    }
  }

  // Align legacy name from older seed
  const legacyTrim = await prisma.service.findFirst({
    where: { salonId: salon.id, name: "Women's trim" },
  });
  if (legacyTrim) {
    await prisma.service.update({
      where: { id: legacyTrim.id },
      data: { name: "Trim & tidy", category: "WOMEN", priceCents: DEFAULT_CENTS, active: true },
    });
    console.log("renamed Women's trim → Trim & tidy");
  }

  const legacyFade = await prisma.service.findFirst({
    where: { salonId: salon.id, name: "Men's fade / taper" },
  });
  if (legacyFade) {
    await prisma.service.update({
      where: { id: legacyFade.id },
      data: { name: "Fade / taper", category: "MEN", priceCents: DEFAULT_CENTS, active: true },
    });
    console.log("renamed Men's fade / taper → Fade / taper");
  }

  console.log("Done. Manager can adjust prices anytime in Services & prices.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
