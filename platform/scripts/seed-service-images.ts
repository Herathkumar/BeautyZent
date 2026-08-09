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
  "Eyebrow trimming": "eyebrow-trimming.jpg",
  "Hair coloring": "hair-coloring.jpg",
  "Beard trimming": "beard-trimming.jpg",
  "Women's haircut": "womens-haircut-style.jpg",
};

/** Only fill services that have no image yet (default). Pass --all to overwrite. */
const forceAll = process.argv.includes("--all");

async function main() {
  const dir = path.join(process.cwd(), "prisma", "seed-assets", "service-images");
  const salon = await prisma.salon.findFirst({ where: { slug: "fhsalon" } });
  if (!salon) {
    throw new Error("Salon fhsalon not found. Run db:seed first.");
  }

  const services = await prisma.service.findMany({
    where: { salonId: salon.id },
    select: {
      id: true,
      name: true,
      imageMime: true,
      imageUpdatedAt: true,
    },
  });

  let updated = 0;
  let skipped = 0;
  for (const service of services) {
    const file = BY_NAME[service.name];
    const hasImage = Boolean(service.imageUpdatedAt && service.imageMime);
    if (!file) {
      if (!hasImage) console.warn(`No asset mapped for: ${service.name}`);
      continue;
    }
    if (hasImage && !forceAll) {
      skipped += 1;
      continue;
    }
    const full = path.join(dir, file);
    if (!existsSync(full)) {
      console.warn(`Missing asset: ${full}`);
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
    console.log(`Updated image: ${service.name} (${bytes.length} bytes)`);
  }
  console.log(`Done. ${updated} updated, ${skipped} already had images.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
