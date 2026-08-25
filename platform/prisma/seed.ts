import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

/** Extra tenants for local multi-salon + isolated e2e (Farzana fixtures stay the default). */
const SEED_EXTRA_SALONS = process.env.SEED_DEMO_SALON !== "false";

/** Retail shelf shown on reception Products and checkout. */
const SAMPLE_PRODUCTS = [
  {
    name: "Shampoo 250ml",
    description: "Daily cleanse for colour-treated hair",
    priceCents: 1800,
    stockQty: 12,
    sku: "SH-250",
  },
  {
    name: "Conditioner 250ml",
    description: "Smoothing conditioner for mid-lengths and ends",
    priceCents: 1800,
    stockQty: 10,
    sku: "CD-250",
  },
  {
    name: "Hair oil",
    description: "Nourishing finishing oil",
    priceCents: 2200,
    stockQty: 8,
    sku: "OIL-01",
  },
  {
    name: "Leave-in conditioner",
    description: "Lightweight detangler for blow-dries",
    priceCents: 2400,
    stockQty: 9,
    sku: "LI-150",
  },
  {
    name: "Heat protectant spray",
    description: "Shields hair up to 230°C",
    priceCents: 2600,
    stockQty: 11,
    sku: "HP-200",
  },
  {
    name: "Repair hair mask",
    description: "Weekly treatment for dry or damaged ends",
    priceCents: 3200,
    stockQty: 7,
    sku: "MASK-01",
  },
  {
    name: "Dry shampoo",
    description: "Volume and refresh between washes",
    priceCents: 2000,
    stockQty: 14,
    sku: "DRY-01",
  },
  {
    name: "Flexible hold hairspray",
    description: "Soft hold that still brushes out",
    priceCents: 2200,
    stockQty: 10,
    sku: "SPRAY-01",
  },
  {
    name: "Shine serum",
    description: "Frizz control with a glass finish",
    priceCents: 2800,
    stockQty: 6,
    sku: "SERUM-01",
  },
];

async function seedSalonProducts(salonId: string) {
  for (const p of SAMPLE_PRODUCTS) {
    const existing = await prisma.product.findFirst({
      where: { salonId, name: p.name },
    });
    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data: p });
    } else {
      await prisma.product.create({ data: { salonId, ...p } });
    }
  }
}

async function seedPlatformAdmin(passwordHash: string) {
  const email = (process.env.PLATFORM_ADMIN_EMAIL || "platform@salonbook.local")
    .toLowerCase()
    .trim();
  const hash = process.env.PLATFORM_ADMIN_PASSWORD
    ? await bcrypt.hash(process.env.PLATFORM_ADMIN_PASSWORD, 10)
    : passwordHash;

  await prisma.platformAdmin.upsert({
    where: { email },
    update: { passwordHash: hash, active: true },
    create: {
      email,
      passwordHash: hash,
      name: process.env.PLATFORM_ADMIN_NAME || "Platform Admin",
    },
  });
  return email;
}

/** Second tenant so multi-salon routing, slugs, and the platform console are exercised. */
async function seedDemoSalon(passwordHash: string) {
  const salon = await prisma.salon.upsert({
    where: { slug: "demosalon" },
    update: {
      name: "Demo Hair Studio",
      // Deliberately unlike FHSalon so per-tenant theming is obvious side by side.
      bookingThemeId: "indigo",
      managerThemeId: "laurel",
      stylistThemeId: "ember",
    },
    create: {
      name: "Demo Hair Studio",
      slug: "demosalon",
      phone: "416-555-0199",
      email: "hello@demosalon.test",
      address: "120 Queen St W, Toronto, ON",
      timezone: "America/Toronto",
      openHour: 10,
      closeHour: 19,
      slotMinutes: 30,
      bookingThemeId: "indigo",
      managerThemeId: "laurel",
      stylistThemeId: "ember",
    },
  });

  await prisma.user.upsert({
    where: { salonId_email: { salonId: salon.id, email: "manager@demosalon.test" } },
    update: { passwordHash, name: "Demo Manager" },
    create: {
      salonId: salon.id,
      email: "manager@demosalon.test",
      passwordHash,
      name: "Demo Manager",
      role: "ADMIN",
    },
  });

  const demoStylists = [
    { name: "Priya", bio: "Colour and balayage", color: "#3f5f8a", gender: "FEMALE" as const },
    { name: "Marco", bio: "Barbering and fades", color: "#2f4356", gender: "MALE" as const },
  ];

  const demoServices = [
    { name: "Women's cut & blow-dry", category: "WOMEN", durationMin: 60, priceCents: 7000, sortOrder: 1 },
    { name: "Balayage", category: "WOMEN", durationMin: 120, priceCents: 18000, sortOrder: 2 },
    { name: "Men's cut", category: "MEN", durationMin: 30, priceCents: 3500, sortOrder: 3 },
    { name: "Skin fade", category: "MEN", durationMin: 45, priceCents: 4500, sortOrder: 4 },
  ];

  const serviceRows = [];
  for (const svc of demoServices) {
    const existing = await prisma.service.findFirst({
      where: { salonId: salon.id, name: svc.name },
    });
    serviceRows.push(
      existing
        ? await prisma.service.update({ where: { id: existing.id }, data: svc })
        : await prisma.service.create({ data: { salonId: salon.id, ...svc } })
    );
  }

  for (const s of demoStylists) {
    const existing = await prisma.stylist.findFirst({
      where: { salonId: salon.id, name: s.name },
    });
    const row = existing
      ? await prisma.stylist.update({ where: { id: existing.id }, data: s })
      : await prisma.stylist.create({ data: { salonId: salon.id, ...s } });

    for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
      await prisma.stylistWeekHour.upsert({
        where: { stylistId_dayOfWeek: { stylistId: row.id, dayOfWeek } },
        update: {},
        create: {
          stylistId: row.id,
          dayOfWeek,
          startHour: salon.openHour,
          endHour: salon.closeHour,
          isOff: dayOfWeek === 0,
        },
      });
    }

    const stylistEmail = `${s.name.toLowerCase()}@demosalon.test`;
    await prisma.user.upsert({
      where: { salonId_email: { salonId: salon.id, email: stylistEmail } },
      update: { passwordHash, name: s.name, role: "STYLIST", stylistId: row.id },
      create: {
        salonId: salon.id,
        email: stylistEmail,
        passwordHash,
        name: s.name,
        role: "STYLIST",
        stylistId: row.id,
      },
    });

    for (const service of serviceRows) {
      if (s.name === "Marco" && service.category === "WOMEN") continue;
      if (s.name === "Priya" && service.category === "MEN") continue;
      await prisma.stylistService.upsert({
        where: { stylistId_serviceId: { stylistId: row.id, serviceId: service.id } },
        update: {},
        create: { stylistId: row.id, serviceId: service.id },
      });
    }
  }

  await seedSalonProducts(salon.id);

  return salon;
}

/** Third tenant — Aaraby's Beauty Parlor — so isolated release runs cover that salon. */
async function seedAarabySalon(passwordHash: string) {
  const salon = await prisma.salon.upsert({
    where: { slug: "aaraby-beauty" },
    update: {
      name: "Aaraby's Beauty Parlor",
      bookingThemeId: "ember",
      managerThemeId: "cocoa",
      stylistThemeId: "seaglass",
    },
    create: {
      name: "Aaraby's Beauty Parlor",
      slug: "aaraby-beauty",
      phone: "416-555-0148",
      email: "hello@aaraby-beauty.test",
      address: "Toronto, ON",
      timezone: "America/Toronto",
      openHour: 9,
      closeHour: 23,
      slotMinutes: 30,
      bookingThemeId: "ember",
      managerThemeId: "cocoa",
      stylistThemeId: "seaglass",
    },
  });

  await prisma.user.upsert({
    where: { salonId_email: { salonId: salon.id, email: "aarabyherath@gmail.com" } },
    update: { passwordHash, name: "Aaraby", role: "ADMIN" },
    create: {
      salonId: salon.id,
      email: "aarabyherath@gmail.com",
      passwordHash,
      name: "Aaraby",
      role: "ADMIN",
    },
  });

  const aarabyStylists = [
    { name: "Ajeesh", bio: "Men's Hair cut specialist", color: "#5c4033", gender: "MALE" as const },
    { name: "Lead Stylist", bio: "Women's cuts and colour", color: "#8b5e4b", gender: "FEMALE" as const },
  ];

  const aarabyServices = [
    { name: "Women's haircut & style", category: "WOMEN", durationMin: 60, priceCents: 7000, sortOrder: 1 },
    { name: "Trim & tidy", category: "WOMEN", durationMin: 20, priceCents: 2500, sortOrder: 2 },
    { name: "Men's haircut", category: "MEN", durationMin: 30, priceCents: 3500, sortOrder: 3 },
    { name: "Fade / taper", category: "MEN", durationMin: 45, priceCents: 4500, sortOrder: 4 },
  ];

  const serviceRows = [];
  for (const svc of aarabyServices) {
    const existing = await prisma.service.findFirst({
      where: { salonId: salon.id, name: svc.name },
    });
    serviceRows.push(
      existing
        ? await prisma.service.update({ where: { id: existing.id }, data: svc })
        : await prisma.service.create({ data: { salonId: salon.id, ...svc } })
    );
  }

  for (const s of aarabyStylists) {
    const existing = await prisma.stylist.findFirst({
      where: { salonId: salon.id, name: s.name },
    });
    const row = existing
      ? await prisma.stylist.update({ where: { id: existing.id }, data: s })
      : await prisma.stylist.create({ data: { salonId: salon.id, ...s } });

    for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
      await prisma.stylistWeekHour.upsert({
        where: { stylistId_dayOfWeek: { stylistId: row.id, dayOfWeek } },
        update: {},
        create: {
          stylistId: row.id,
          dayOfWeek,
          startHour: salon.openHour,
          endHour: salon.closeHour,
          isOff: dayOfWeek === 0,
        },
      });
    }

    const stylistEmail =
      s.name === "Ajeesh" ? "ajeesh@gmail.com" : "lead@aaraby-beauty.test";
    await prisma.user.upsert({
      where: { salonId_email: { salonId: salon.id, email: stylistEmail } },
      update: { passwordHash, name: s.name, role: "STYLIST", stylistId: row.id },
      create: {
        salonId: salon.id,
        email: stylistEmail,
        passwordHash,
        name: s.name,
        role: "STYLIST",
        stylistId: row.id,
      },
    });

    for (const service of serviceRows) {
      if (s.name === "Ajeesh" && service.category === "WOMEN") continue;
      if (s.name === "Lead Stylist" && service.category === "MEN") continue;
      await prisma.stylistService.upsert({
        where: { stylistId_serviceId: { stylistId: row.id, serviceId: service.id } },
        update: {},
        create: { stylistId: row.id, serviceId: service.id },
      });
    }
  }

  await seedSalonProducts(salon.id);
  return salon;
}

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const salon = await prisma.salon.upsert({
    where: { slug: "fhsalon" },
    update: {
      name: "Farzana Hair Salon",
      phone: "905-920-2277",
      address: "8 Taywood Crt, Dundas, ON L9H 7A2",
      // The original Farzana palettes, now expressed as theme packs.
      bookingThemeId: "plum",
      managerThemeId: "cocoa",
      stylistThemeId: "seaglass",
    },
    create: {
      name: "Farzana Hair Salon",
      slug: "fhsalon",
      phone: "905-920-2277",
      email: "hello@fhsalon.ca",
      address: "8 Taywood Crt, Dundas, ON L9H 7A2",
      timezone: "America/Toronto",
      openHour: 9,
      closeHour: 18,
      slotMinutes: 30,
      bookingThemeId: "plum",
      managerThemeId: "cocoa",
      stylistThemeId: "seaglass",
    },
  });

  const legacyAdmin = await prisma.user.findFirst({
    where: { salonId: salon.id, email: "admin@fhsalon.ca" },
  });
  if (legacyAdmin) {
    await prisma.user.update({
      where: { id: legacyAdmin.id },
      data: {
        email: "manager@fhsalon.ca",
        name: "Salon Manager",
        passwordHash,
        role: "ADMIN",
      },
    });
  } else {
    await prisma.user.upsert({
      where: { salonId_email: { salonId: salon.id, email: "manager@fhsalon.ca" } },
      update: { passwordHash, name: "Salon Manager" },
      create: {
        salonId: salon.id,
        email: "manager@fhsalon.ca",
        passwordHash,
        name: "Salon Manager",
        role: "ADMIN", // Manager portal (ADMIN kept for existing accounts; UI says Manager)
      },
    });
  }

  const stylists = [
    {
      name: "Farzana",
      bio: "Owner stylist — women's & men's cuts",
      color: "#6e4a38",
      gender: "FEMALE" as const,
      selfManageSchedule: true,
      payType: "BOTH",
      hourlyRateCents: 2500,
      commissionBps: 5000,
    },
    {
      name: "Aisha",
      bio: "Women's cuts and restyles",
      color: "#8b5e4b",
      gender: "FEMALE" as const,
      selfManageSchedule: false,
      payType: "COMMISSION",
      hourlyRateCents: null as number | null,
      commissionBps: 4500,
    },
    {
      name: "Omar",
      bio: "Men's fades and classic cuts",
      color: "#3d342e",
      gender: "MALE" as const,
      selfManageSchedule: false,
      payType: "COMMISSION",
      hourlyRateCents: null as number | null,
      commissionBps: 4000,
    },
  ];

  const stylistRows = [];
  for (const s of stylists) {
    const existing = await prisma.stylist.findFirst({
      where: { salonId: salon.id, name: s.name },
    });
    const row = existing
      ? await prisma.stylist.update({ where: { id: existing.id }, data: s })
      : await prisma.stylist.create({ data: { salonId: salon.id, ...s } });
    stylistRows.push(row);

    // Default: Mon–Sat salon hours, Sunday off
    for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
      await prisma.stylistWeekHour.upsert({
        where: {
          stylistId_dayOfWeek: { stylistId: row.id, dayOfWeek },
        },
        update: {},
        create: {
          stylistId: row.id,
          dayOfWeek,
          startHour: salon.openHour,
          endHour: salon.closeHour,
          isOff: dayOfWeek === 0,
        },
      });
    }

    // Stylist portal login (name@fhsalon.ca)
    const stylistEmail = `${s.name.toLowerCase()}@fhsalon.ca`;
    await prisma.user.upsert({
      where: { salonId_email: { salonId: salon.id, email: stylistEmail } },
      update: {
        passwordHash,
        name: s.name,
        role: "STYLIST",
        stylistId: row.id,
      },
      create: {
        salonId: salon.id,
        email: stylistEmail,
        passwordHash,
        name: s.name,
        role: "STYLIST",
        stylistId: row.id,
      },
    });
  }

  const services = [
    { name: "Women's haircut & style", category: "WOMEN", durationMin: 60, priceCents: 2000, sortOrder: 1 },
    { name: "Trim & tidy", category: "WOMEN", durationMin: 30, priceCents: 2000, sortOrder: 2 },
    { name: "Bang / fringe trim", category: "WOMEN", durationMin: 15, priceCents: 2000, sortOrder: 3 },
    { name: "Men's haircut", category: "MEN", durationMin: 30, priceCents: 2000, sortOrder: 4 },
    { name: "Fade / taper", category: "MEN", durationMin: 45, priceCents: 2000, sortOrder: 5 },
    { name: "Beard tidy (with cut)", category: "MEN", durationMin: 15, priceCents: 2000, sortOrder: 6 },
  ];

  const serviceImageFiles: Record<string, string> = {
    "Women's haircut & style": "womens-haircut-style.jpg",
    "Trim & tidy": "trim-tidy.jpg",
    "Bang / fringe trim": "bang-fringe-trim.jpg",
    "Men's haircut": "mens-haircut.jpg",
    "Fade / taper": "fade-taper.jpg",
    "Beard tidy (with cut)": "beard-tidy.jpg",
  };
  const serviceImageDir = path.join(__dirname, "seed-assets", "service-images");

  const serviceRows = [];
  for (const svc of services) {
    const existing = await prisma.service.findFirst({
      where: { salonId: salon.id, name: svc.name },
    });
    const imageFile = serviceImageFiles[svc.name];
    const imagePath = imageFile ? path.join(serviceImageDir, imageFile) : null;
    const imageBytes =
      imagePath && fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : null;
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
            ...svc,
            // Keep an existing custom AI image unless this row has none yet.
            ...(existing.imageData?.length ? {} : imageData),
          },
        })
      : await prisma.service.create({
          data: { salonId: salon.id, ...svc, ...imageData },
        });
    serviceRows.push(row);
  }

  for (const stylist of stylistRows) {
    for (const service of serviceRows) {
      const menOnly = service.category === "MEN";
      const womenOnly = service.category === "WOMEN";
      if (stylist.name === "Omar" && womenOnly) continue;
      if (stylist.name === "Aisha" && menOnly) continue;
      await prisma.stylistService.upsert({
        where: {
          stylistId_serviceId: { stylistId: stylist.id, serviceId: service.id },
        },
        update: {},
        create: { stylistId: stylist.id, serviceId: service.id },
      });
    }
  }

  await seedSalonProducts(salon.id);

  const others = await prisma.salon.findMany({
    where: {
      active: true,
      slug: { notIn: ["fhsalon", "demosalon"] },
    },
    select: { id: true, name: true, slug: true },
  });
  for (const extra of others) {
    await seedSalonProducts(extra.id);
    console.log(`Seeded sample products for ${extra.name} (${extra.slug})`);
  }

  const platformEmail = await seedPlatformAdmin(passwordHash);
  if (SEED_EXTRA_SALONS) {
    await seedDemoSalon(passwordHash);
    await seedAarabySalon(passwordHash);
  }

  console.log("Seeded Farzana Hair Salon (slug: fhsalon)");
  console.log("Manager: manager@fhsalon.ca / demo1234");
  console.log("Stylist portal: farzana@fhsalon.ca / demo1234 (also aisha@, omar@)");
  console.log("Book: /book/fhsalon | Display: /display/fhsalon | Stylist: /stylist");
  if (SEED_EXTRA_SALONS) {
    console.log("Seeded Demo Hair Studio (slug: demosalon)");
    console.log("Manager: manager@demosalon.test / demo1234");
    console.log("Stylist portal: priya@demosalon.test / demo1234 (also marco@)");
    console.log("Book: /book/demosalon | Display: /display/demosalon");
    console.log("");
    console.log("Seeded Aaraby's Beauty Parlor (slug: aaraby-beauty)");
    console.log("Manager: aarabyherath@gmail.com / demo1234");
    console.log("Stylist portal: ajeesh@gmail.com / demo1234");
    console.log("Book: /book/aaraby-beauty | Display: /display/aaraby-beauty");
  }
  console.log("");
  console.log(
    `Platform console: /platform — ${platformEmail} / ${
      process.env.PLATFORM_ADMIN_PASSWORD || "demo1234"
    }`
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
