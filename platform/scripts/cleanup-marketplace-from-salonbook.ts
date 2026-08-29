/**
 * One-shot: strip marketplace columns/tables from the multi-salon DB only.
 *
 * Safe guards: refuses anything that is not local 55433/salonbook.
 * Does not change Prisma schema files (marketplace branch keeps those).
 *
 * Run: pnpm exec tsx scripts/with-local-env.ts tsx scripts/cleanup-marketplace-from-salonbook.ts
 */
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL || "";
let host = "";
let port = "";
let db = "";
try {
  const u = new URL(url);
  host = u.hostname;
  port = u.port || "5432";
  db = u.pathname.replace(/^\//, "").split("?")[0];
} catch {
  console.error("Invalid DATABASE_URL");
  process.exit(1);
}

const local = ["localhost", "127.0.0.1", "::1"].includes(host);
if (!local || port !== "55433" || db !== "salonbook") {
  console.error(
    [
      "Refusing cleanup — this script only runs against multi-salon local DB.",
      `Got: ${host}:${port}/${db}`,
      "Expected: 127.0.0.1:55433/salonbook",
      "",
      "Marketplace DB (55434/beautyzent) is left alone.",
    ].join("\n")
  );
  process.exit(1);
}

const prisma = new PrismaClient();

const statements = [
  `ALTER TABLE "Client" DROP CONSTRAINT IF EXISTS "Client_accountId_fkey"`,
  `DROP INDEX IF EXISTS "Client_accountId_idx"`,
  `ALTER TABLE "Client" DROP COLUMN IF EXISTS "accountId"`,
  `ALTER TABLE "ConsumerOtp" DROP CONSTRAINT IF EXISTS "ConsumerOtp_accountId_fkey"`,
  `DROP TABLE IF EXISTS "ConsumerOtp"`,
  `DROP TABLE IF EXISTS "ConsumerAccount"`,
  `ALTER TABLE "Salon" DROP COLUMN IF EXISTS "listingStatus"`,
  `ALTER TABLE "Salon" DROP COLUMN IF EXISTS "businessType"`,
  `ALTER TABLE "Salon" DROP COLUMN IF EXISTS "city"`,
  `ALTER TABLE "Salon" DROP COLUMN IF EXISTS "region"`,
  `ALTER TABLE "Salon" DROP COLUMN IF EXISTS "country"`,
  `ALTER TABLE "Salon" DROP COLUMN IF EXISTS "lat"`,
  `ALTER TABLE "Salon" DROP COLUMN IF EXISTS "lng"`,
  `ALTER TABLE "Salon" DROP COLUMN IF EXISTS "description"`,
  `ALTER TABLE "Salon" DROP COLUMN IF EXISTS "coverMime"`,
  `ALTER TABLE "Salon" DROP COLUMN IF EXISTS "coverData"`,
  `ALTER TABLE "Salon" DROP COLUMN IF EXISTS "coverUpdatedAt"`,
  `ALTER TABLE "Salon" DROP COLUMN IF EXISTS "claimedAt"`,
  `ALTER TABLE "Salon" DROP COLUMN IF EXISTS "approvedAt"`,
  `ALTER TABLE "Salon" DROP COLUMN IF EXISTS "approvedById"`,
  `ALTER TABLE "Salon" DROP COLUMN IF EXISTS "listingReviewNote"`,
  `ALTER TABLE "Salon" DROP COLUMN IF EXISTS "listingReviewedAt"`,
];

async function main() {
  console.log(`Cleaning marketplace artifacts from ${host}:${port}/${db} …`);
  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log(`  OK  ${sql}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Column/table already gone is fine
      if (/does not exist|cannot drop/i.test(msg)) {
        console.log(`  skip ${sql} (${msg.split("\n")[0]})`);
      } else {
        throw e;
      }
    }
  }

  const leftover = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'Salon'
       AND column_name IN (
         'listingStatus','businessType','city','region','country','lat','lng',
         'description','coverMime','coverData','coverUpdatedAt','claimedAt','approvedAt','approvedById',
         'listingReviewNote','listingReviewedAt'
       )
     ORDER BY column_name`
  );
  const tables = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
    `SELECT tablename FROM pg_tables
     WHERE schemaname = 'public' AND tablename IN ('ConsumerAccount','ConsumerOtp')`
  );
  const clientCol = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'Client' AND column_name = 'accountId'`
  );

  if (leftover.length || tables.length || clientCol.length) {
    console.error("Cleanup incomplete:", { leftover, tables, clientCol });
    process.exit(1);
  }

  console.log("Done. salonbook is multi-salon-only again.");
  console.log("Marketplace continues on 127.0.0.1:55434/beautyzent.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
