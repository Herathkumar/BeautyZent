/**
 * Production reset for Farzana Hair Salon.
 * Wipes demo/test data and leaves: salon shell + one ADMIN user only.
 *
 * Usage (from platform/):
 *   $env:CONFIRM_PRODUCTION_RESET="YES"
 *   # optional: $env:PRODUCTION_ADMIN_PASSWORD="YourStrongPassword"
 *   pnpm db:seed:production
 */
import { randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SLUG = process.env.PRODUCTION_SALON_SLUG || "fhsalon";
const ADMIN_EMAIL = (process.env.PRODUCTION_ADMIN_EMAIL || "admin@fhsalon.ca").toLowerCase();

function generatePassword(length = 14) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

async function main() {
  if (process.env.CONFIRM_PRODUCTION_RESET !== "YES") {
    console.error(
      [
        "Refusing to wipe the database.",
        'Set CONFIRM_PRODUCTION_RESET=YES to continue.',
        "",
        "Example (PowerShell):",
        '  $env:CONFIRM_PRODUCTION_RESET="YES"',
        "  pnpm db:seed:production",
      ].join("\n")
    );
    process.exit(1);
  }

  const adminPassword =
    process.env.PRODUCTION_ADMIN_PASSWORD?.trim() || generatePassword(14);
  if (adminPassword.length < 8) {
    throw new Error("PRODUCTION_ADMIN_PASSWORD must be at least 8 characters");
  }

  const existing = await prisma.salon.findUnique({ where: { slug: SLUG } });
  if (existing) {
    // Cascades: users, stylists (+hours/blocks/photos), services, products, clients, appointments
    await prisma.salon.delete({ where: { id: existing.id } });
    console.log(`Removed salon "${existing.name}" (${existing.slug}) and all related data.`);
  } else {
    console.log(`No existing salon with slug "${SLUG}" — creating fresh.`);
  }

  // Safety: remove orphan rows from other test salons if any
  const leftover = await prisma.salon.count();
  if (leftover > 0) {
    await prisma.salon.deleteMany({});
    console.log(`Removed ${leftover} other salon(s).`);
  }

  const salon = await prisma.salon.create({
    data: {
      name: "Farzana Hair Salon",
      slug: SLUG,
      phone: "905-920-2277",
      email: "hello@fhsalon.ca",
      address: "8 Taywood Crt, Dundas, ON L9H 7A2",
      timezone: "America/Toronto",
      openHour: 9,
      closeHour: 18,
      slotMinutes: 30,
    },
  });

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.create({
    data: {
      salonId: salon.id,
      email: ADMIN_EMAIL,
      passwordHash,
      name: "Salon Admin",
      role: "ADMIN",
    },
  });

  const counts = {
    stylists: await prisma.stylist.count(),
    services: await prisma.service.count(),
    products: await prisma.product.count(),
    appointments: await prisma.appointment.count(),
    users: await prisma.user.count(),
  };

  console.log("");
  console.log("=== Production database ready ===");
  console.log(`Salon: ${salon.name}`);
  console.log(`Slug:  ${salon.slug}`);
  console.log(`Book:  /book/${salon.slug}`);
  console.log(`Admin: /admin/login`);
  console.log("");
  console.log("Admin login (save this — shown once):");
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${adminPassword}`);
  console.log("");
  console.log("Catalog is empty. In Admin, create:");
  console.log("  1) Services");
  console.log("  2) Stylists (+ logins) — share temp passwords once");
  console.log("  3) Products (optional)");
  console.log("  4) Link services ↔ stylists if needed (Fix: link all…)");
  console.log("");
  console.log("Counts:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
