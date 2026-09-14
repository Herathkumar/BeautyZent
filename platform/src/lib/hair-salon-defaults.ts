/**
 * Default lounge catalog for Hair salon (businessType = SALON):
 * Looks of the week + retail favorites with shelf photos.
 * Other verticals (barber, spa, nails, …) can plug in later.
 */
import { existsSync, readFileSync } from "fs";
import path from "path";
import type { PrismaClient } from "@prisma/client";
import { normalizeBusinessType } from "@/lib/marketplace";

type Db = Pick<PrismaClient, "salonLook" | "product">;

export type HairSalonLookSeed = {
  styleNumber: number;
  title: string;
  category: "WOMEN" | "MEN" | "COLOR" | "BEARD" | "OTHER";
  description: string;
  beforeFile: string;
  afterFile: string;
  sortOrder: number;
};

export type HairSalonProductSeed = {
  name: string;
  aliases?: string[];
  description: string;
  priceCents: number;
  stockQty: number;
  sku: string;
  file: string;
};

/** Numbered before/after styles for lounge TV (assets under public/lounge). */
export const HAIR_SALON_DEFAULT_LOOKS: HairSalonLookSeed[] = [
  {
    styleNumber: 1,
    title: "Soft Waves",
    category: "WOMEN",
    description: "Glossy volume waves — ask for style #1",
    beforeFile: "look-01-waves-before.png",
    afterFile: "look-01-waves-after.png",
    sortOrder: 1,
  },
  {
    styleNumber: 2,
    title: "Classic Fade",
    category: "MEN",
    description: "Clean fade with textured crop — ask for style #2",
    beforeFile: "look-02-fade-before.png",
    afterFile: "look-02-fade-after.png",
    sortOrder: 2,
  },
  {
    styleNumber: 3,
    title: "Caramel Balayage",
    category: "COLOR",
    description: "Sunlit balayage with soft waves — ask for style #3",
    beforeFile: "look-03-balayage-before.png",
    afterFile: "look-03-balayage-after.png",
    sortOrder: 3,
  },
  {
    styleNumber: 4,
    title: "Polished Blowout",
    category: "WOMEN",
    description: "Salon blowout shine finish — ask for style #4",
    beforeFile: "look-04-blowout-before.png",
    afterFile: "look-04-blowout-after.png",
    sortOrder: 4,
  },
  {
    styleNumber: 5,
    title: "Executive Cut",
    category: "MEN",
    description: "Neat professional cut — ask for style #5",
    beforeFile: "look-05-executive-before.png",
    afterFile: "look-05-executive-after.png",
    sortOrder: 5,
  },
  {
    styleNumber: 6,
    title: "Warm Highlights",
    category: "COLOR",
    description: "Dimensional warm highlights — ask for style #6",
    beforeFile: "look-06-highlights-before.png",
    afterFile: "look-06-highlights-after.png",
    sortOrder: 6,
  },
  {
    styleNumber: 7,
    title: "Full Hair Colour",
    category: "COLOR",
    description: "All-over colour refresh with shine — ask for style #7",
    beforeFile: "look-07-colour-before.png",
    afterFile: "look-07-colour-after.png",
    sortOrder: 7,
  },
  {
    styleNumber: 8,
    title: "Sculpted Beard",
    category: "BEARD",
    description: "Clean line-up and beard shape — ask for style #8",
    beforeFile: "look-08-beard-before.png",
    afterFile: "look-08-beard-after.png",
    sortOrder: 8,
  },
];

/** Retail shelf / lounge favorites (assets under prisma/seed-assets/product-images). */
export const HAIR_SALON_DEFAULT_PRODUCTS: HairSalonProductSeed[] = [
  {
    name: "Shampoo 250ml",
    aliases: ["Shamoo", "Shampoo"],
    description: "Salon shampoo for daily care",
    priceCents: 1800,
    stockQty: 12,
    sku: "SH-250",
    file: "shampoo.jpg",
  },
  {
    name: "Conditioner 250ml",
    aliases: ["Conditioner"],
    description: "Salon conditioner for soft finish",
    priceCents: 1800,
    stockQty: 10,
    sku: "CD-250",
    file: "conditioner.jpg",
  },
  {
    name: "Hair oil",
    aliases: ["Hair Oil", "Oil"],
    description: "Nourishing finishing oil",
    priceCents: 2200,
    stockQty: 8,
    sku: "OIL-01",
    file: "hair-oil.jpg",
  },
  {
    name: "Hair serum",
    description: "Lightweight shine serum",
    priceCents: 2400,
    stockQty: 10,
    sku: "SR-01",
    file: "hair-serum.jpg",
  },
  {
    name: "Leave-in conditioner",
    description: "Detangle and soften without rinse",
    priceCents: 2000,
    stockQty: 9,
    sku: "LI-01",
    file: "leave-in.jpg",
  },
  {
    name: "Hair mask",
    description: "Deep conditioning weekly mask",
    priceCents: 2800,
    stockQty: 7,
    sku: "MSK-01",
    file: "hair-mask.jpg",
  },
  {
    name: "Dry shampoo",
    description: "Refresh between washes",
    priceCents: 1900,
    stockQty: 11,
    sku: "DS-01",
    file: "dry-shampoo.jpg",
  },
  {
    name: "Styling gel",
    description: "Strong hold with natural shine",
    priceCents: 1600,
    stockQty: 10,
    sku: "GEL-01",
    file: "styling-gel.jpg",
  },
  {
    name: "Hair spray",
    description: "Flexible hold finishing spray",
    priceCents: 1700,
    stockQty: 12,
    sku: "SP-01",
    file: "hair-spray.jpg",
  },
  {
    name: "Volumizing mousse",
    description: "Lift and body for fine hair",
    priceCents: 1800,
    stockQty: 8,
    sku: "MS-01",
    file: "mousse.jpg",
  },
  {
    name: "Curl cream",
    description: "Define curls without crunch",
    priceCents: 2100,
    stockQty: 9,
    sku: "CC-01",
    file: "curl-cream.jpg",
  },
  {
    name: "Heat protectant",
    description: "Shield before blow-dry or iron",
    priceCents: 2000,
    stockQty: 10,
    sku: "HP-01",
    file: "heat-protectant.jpg",
  },
  {
    name: "Beard oil",
    description: "Soften and condition facial hair",
    priceCents: 2200,
    stockQty: 8,
    sku: "BO-01",
    file: "beard-oil.jpg",
  },
  {
    name: "Beard balm",
    description: "Shape and tame the beard",
    priceCents: 2400,
    stockQty: 7,
    sku: "BB-01",
    file: "beard-balm.jpg",
  },
  {
    name: "Pomade",
    description: "Classic hold with shine",
    priceCents: 1900,
    stockQty: 10,
    sku: "PM-01",
    file: "pomade.jpg",
  },
  {
    name: "Matte clay",
    description: "Texture and natural matte finish",
    priceCents: 2000,
    stockQty: 9,
    sku: "CL-01",
    file: "matte-clay.jpg",
  },
  {
    name: "Scalp scrub",
    description: "Exfoliate and refresh the scalp",
    priceCents: 2600,
    stockQty: 6,
    sku: "SC-01",
    file: "scalp-scrub.jpg",
  },
  {
    name: "Argan oil treatment",
    description: "Rich argan oil for dry ends",
    priceCents: 2700,
    stockQty: 7,
    sku: "AR-01",
    file: "argan-oil.jpg",
  },
  {
    name: "Color-protect shampoo",
    description: "Gentle cleanse for colour-treated hair",
    priceCents: 2000,
    stockQty: 8,
    sku: "CPS-01",
    file: "color-shampoo.jpg",
  },
  {
    name: "Keratin serum",
    description: "Smooth and reduce frizz",
    priceCents: 2900,
    stockQty: 6,
    sku: "KS-01",
    file: "keratin-serum.jpg",
  },
  {
    name: "Detangling spray",
    description: "Easy comb-through for wet hair",
    priceCents: 1500,
    stockQty: 11,
    sku: "DT-01",
    file: "detangler.jpg",
  },
  {
    name: "Hair perfume mist",
    description: "Light fragrance finish for hair",
    priceCents: 2500,
    stockQty: 5,
    sku: "HM-01",
    file: "hair-mist.jpg",
  },
  {
    name: "Volume powder",
    description: "Root lift and texture",
    priceCents: 1800,
    stockQty: 8,
    sku: "VP-01",
    file: "volume-powder.jpg",
  },
  {
    name: "Hand cream",
    description: "Rich cream for soft hands after services",
    priceCents: 1600,
    stockQty: 10,
    sku: "HC-01",
    file: "hand-cream.jpg",
  },
  {
    name: "Cuticle oil",
    description: "Nourish nails and cuticles",
    priceCents: 1400,
    stockQty: 12,
    sku: "CO-01",
    file: "cuticle-oil.jpg",
  },
  {
    name: "Sheet mask",
    description: "Hydrating facial sheet mask",
    priceCents: 1200,
    stockQty: 15,
    sku: "SM-01",
    file: "sheet-mask.jpg",
  },
  {
    name: "Travel dry oil spray",
    description: "Mini shine mist for on the go",
    priceCents: 1800,
    stockQty: 9,
    sku: "TS-01",
    file: "travel-spray.jpg",
  },
];

export function isHairSalonBusinessType(businessType?: string | null) {
  return normalizeBusinessType(businessType) === "SALON";
}

function mimeFor(file: string) {
  const lower = file.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function readAsset(fullPath: string, strict: boolean) {
  if (!existsSync(fullPath)) {
    if (strict) throw new Error(`Missing seed asset: ${fullPath}`);
    return null;
  }
  return readFileSync(fullPath);
}

function looksDir() {
  return path.join(process.cwd(), "public", "lounge");
}

function productsDir() {
  return path.join(process.cwd(), "prisma", "seed-assets", "product-images");
}

export async function seedHairSalonLooks(
  db: Db,
  salonId: string,
  opts?: { strict?: boolean }
) {
  const strict = opts?.strict ?? false;
  let count = 0;
  for (const look of HAIR_SALON_DEFAULT_LOOKS) {
    const before = readAsset(path.join(looksDir(), look.beforeFile), strict);
    const after = readAsset(path.join(looksDir(), look.afterFile), strict);
    if (!before?.length || !after?.length) {
      console.warn(`Skip look #${look.styleNumber} ${look.title}: missing image files`);
      continue;
    }
    await db.salonLook.upsert({
      where: {
        salonId_styleNumber: { salonId, styleNumber: look.styleNumber },
      },
      create: {
        salonId,
        styleNumber: look.styleNumber,
        title: look.title,
        category: look.category,
        description: look.description,
        beforeData: before,
        beforeMime: mimeFor(look.beforeFile),
        afterData: after,
        afterMime: mimeFor(look.afterFile),
        active: true,
        sortOrder: look.sortOrder,
      },
      update: {
        title: look.title,
        category: look.category,
        description: look.description,
        beforeData: before,
        beforeMime: mimeFor(look.beforeFile),
        afterData: after,
        afterMime: mimeFor(look.afterFile),
        active: true,
        sortOrder: look.sortOrder,
      },
    });
    count += 1;
  }
  return count;
}

export async function seedHairSalonProducts(
  db: Db,
  salonId: string,
  opts?: { strict?: boolean }
) {
  const strict = opts?.strict ?? false;
  let count = 0;
  for (const item of HAIR_SALON_DEFAULT_PRODUCTS) {
    const imageBytes = readAsset(path.join(productsDir(), item.file), false);
    if (strict && !imageBytes?.length) {
      throw new Error(`Missing product image: ${item.file}`);
    }
    const imageData = imageBytes?.length
      ? {
          imageData: imageBytes,
          imageMime: mimeFor(item.file),
          imageUpdatedAt: new Date(),
        }
      : {};

    const names = [item.name, ...(item.aliases || [])];
    let existing: { id: string } | null = null;
    for (const n of names) {
      existing = await db.product.findFirst({
        where: { salonId, name: n },
        select: { id: true },
      });
      if (existing) break;
    }

    const fields = {
      name: item.name,
      description: item.description,
      priceCents: item.priceCents,
      stockQty: item.stockQty,
      sku: item.sku,
      active: true,
      ...imageData,
    };

    if (existing) {
      await db.product.update({ where: { id: existing.id }, data: fields });
    } else {
      await db.product.create({ data: { salonId, ...fields } });
    }
    count += 1;
  }
  return count;
}

/** Seed Looks of the week + Retail favorites for a Hair salon tenant. */
export async function seedHairSalonDefaults(
  db: Db,
  salonId: string,
  opts?: { strict?: boolean }
) {
  const looks = await seedHairSalonLooks(db, salonId, opts);
  const products = await seedHairSalonProducts(db, salonId, opts);
  return { looks, products };
}

/**
 * Vertical-aware default catalog. Only Hair salon is implemented today;
 * other business types intentionally no-op until their photo packs land.
 */
export async function seedDefaultsForBusinessType(
  db: Db,
  salonId: string,
  businessType?: string | null,
  opts?: { strict?: boolean }
) {
  if (!isHairSalonBusinessType(businessType)) {
    return { looks: 0, products: 0, applied: false as const };
  }
  const result = await seedHairSalonDefaults(db, salonId, opts);
  return { ...result, applied: true as const };
}
