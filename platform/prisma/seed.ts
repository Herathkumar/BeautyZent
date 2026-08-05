import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const salon = await prisma.salon.upsert({
    where: { slug: "fhsalon" },
    update: {
      name: "Farzana Hair Salon",
      phone: "905-920-2277",
      address: "8 Taywood Crt, Dundas, ON L9H 7A2",
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
    { name: "Women's haircut & style", category: "WOMEN", durationMin: 60, priceCents: 4500, sortOrder: 1 },
    { name: "Women's trim", category: "WOMEN", durationMin: 30, priceCents: 3000, sortOrder: 2 },
    { name: "Men's haircut", category: "MEN", durationMin: 30, priceCents: 2500, sortOrder: 3 },
    { name: "Men's fade / taper", category: "MEN", durationMin: 45, priceCents: 3000, sortOrder: 4 },
    { name: "Beard tidy (with cut)", category: "MEN", durationMin: 15, priceCents: 1000, sortOrder: 5 },
  ];

  const serviceRows = [];
  for (const svc of services) {
    const existing = await prisma.service.findFirst({
      where: { salonId: salon.id, name: svc.name },
    });
    const row = existing
      ? await prisma.service.update({ where: { id: existing.id }, data: svc })
      : await prisma.service.create({ data: { salonId: salon.id, ...svc } });
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

  const products = [
    { name: "Shampoo 250ml", description: "Salon shampoo", priceCents: 1800, stockQty: 12, sku: "SH-250" },
    { name: "Conditioner 250ml", description: "Salon conditioner", priceCents: 1800, stockQty: 10, sku: "CD-250" },
    { name: "Hair oil", description: "Nourishing oil", priceCents: 2200, stockQty: 8, sku: "OIL-01" },
  ];

  for (const p of products) {
    const existing = await prisma.product.findFirst({
      where: { salonId: salon.id, name: p.name },
    });
    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data: p });
    } else {
      await prisma.product.create({ data: { salonId: salon.id, ...p } });
    }
  }

  console.log("Seeded Farzana Hair Salon (slug: fhsalon)");
  console.log("Manager: manager@fhsalon.ca / demo1234");
  console.log("Stylist portal: farzana@fhsalon.ca / demo1234 (also aisha@, omar@)");
  console.log("Book: /book/fhsalon | Display: /display/fhsalon | Stylist: /stylist");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
