/**
 * Load menu images from prisma/seed-assets/service-images into Service rows.
 * Run: pnpm exec tsx scripts/seed-service-images.ts
 */
import { readFileSync, existsSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BY_NAME: Record<string, string> = {
  "Women's haircut & style": "womens-haircut-style.jpg",
  "Trim & tidy": "trim-tidy.jpg",
  "Bang / fringe trim": "bang-fringe-trim.jpg",
  "Men's haircut": "mens-haircut.jpg",
  "Fade / taper": "fade-taper.jpg",
  "Beard tidy (with cut)": "beard-tidy.jpg",
};

async function main() {
  const dir = path.join(process.cwd(), "prisma", "seed-assets", "service-images");
  const salon = await prisma.salon.findFirst({ where: { slug: "fhsalon" } });
  if (!salon) {
    throw new Error("Salon fhsalon not found. Run db:seed first.");
  }

  let updated = 0;
  for (const [name, file] of Object.entries(BY_NAME)) {
    const full = path.join(dir, file);
    if (!existsSync(full)) {
      console.warn(`Missing asset: ${full}`);
      continue;
    }
    const service = await prisma.service.findFirst({
      where: { salonId: salon.id, name },
      select: { id: true, imageUpdatedAt: true },
    });
    if (!service) {
      console.warn(`Service not found: ${name}`);
      continue;
    }
    const bytes = readFileSync(full);
    await prisma.service.update({
      where: { id: service.id },
      data: {
        imageData: bytes,
        imageMime: "image/jpeg",
        imageUpdatedAt: new Date(),
      },
    });
    updated += 1;
    console.log(`Updated image: ${name} (${bytes.length} bytes)`);
  }
  console.log(`Done. ${updated} service image(s) stored.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
