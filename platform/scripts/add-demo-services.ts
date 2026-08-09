/**
 * Add two demo menu services (Women + Men) with images for display testing.
 * Run: pnpm exec tsx scripts/add-demo-services.ts
 */
import { readFileSync, existsSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { linkServiceToAllStylists } from "../src/lib/service-links";

const prisma = new PrismaClient();

const DEMOS = [
  {
    name: "Blow dry & style",
    category: "WOMEN",
    durationMin: 45,
    priceCents: 3500,
    sortOrder: 20,
    file: "blow-dry-style.jpg",
    description: "Smooth finish and salon-ready style.",
  },
  {
    name: "Hot towel shave",
    category: "MEN",
    durationMin: 30,
    priceCents: 2500,
    sortOrder: 21,
    file: "hot-towel-shave.jpg",
    description: "Classic clean shave with hot towel comfort.",
  },
] as const;

async function main() {
  const salon = await prisma.salon.findFirst({ where: { slug: "fhsalon" } });
  if (!salon) throw new Error("Salon fhsalon not found");

  const dir = path.join(process.cwd(), "prisma", "seed-assets", "service-images");

  for (const demo of DEMOS) {
    const imagePath = path.join(dir, demo.file);
    const imageBytes = existsSync(imagePath) ? readFileSync(imagePath) : null;

    const existing = await prisma.service.findFirst({
      where: { salonId: salon.id, name: demo.name },
    });

    const imageData = imageBytes
      ? {
          imageData: imageBytes,
          imageMime: "image/jpeg" as const,
          imageUpdatedAt: new Date(),
        }
      : {};

    const row = existing
      ? await prisma.service.update({
          where: { id: existing.id },
          data: {
            category: demo.category,
            durationMin: demo.durationMin,
            priceCents: demo.priceCents,
            sortOrder: demo.sortOrder,
            description: demo.description,
            active: true,
            ...imageData,
          },
        })
      : await prisma.service.create({
          data: {
            salonId: salon.id,
            name: demo.name,
            category: demo.category,
            durationMin: demo.durationMin,
            priceCents: demo.priceCents,
            sortOrder: demo.sortOrder,
            description: demo.description,
            active: true,
            ...imageData,
          },
        });

    await linkServiceToAllStylists(salon.id, row.id);
    console.log(
      `${existing ? "Updated" : "Created"}: ${row.name} (${demo.category}) ${
        imageBytes ? `+ image ${imageBytes.length}b` : "no image file"
      }`
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
