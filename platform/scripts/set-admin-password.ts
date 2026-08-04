import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const password = process.argv[2];
  const email = (process.argv[3] || "admin@fhsalon.ca").toLowerCase();
  if (!password || password.length < 8) {
    console.error("Usage: tsx scripts/set-admin-password.ts <password> [email]");
    process.exit(1);
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await prisma.user.updateMany({
    where: { email, role: { in: ["ADMIN", "FRONT_DESK"] } },
    data: { passwordHash },
  });
  console.log(`Updated ${result.count} user(s) for ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
