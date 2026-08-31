import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$executeRawUnsafe(`
    UPDATE "Salon"
    SET
      "loungePromoBoardEnabled" = "promoBoardEnabled",
      "schedulerPromoBoardEnabled" = "promoBoardEnabled"
  `);
  console.log("Copied promoBoardEnabled → lounge/scheduler promo flags. Rows:", rows);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
