import { PrismaClient } from "@prisma/client";

const PRISMA_POOL_GEN = 3;

function prismaUrl() {
  const raw = process.env.DATABASE_URL || "";
  try {
    const url = new URL(raw);
    const pooled =
      url.hostname.includes("-pooler.") || url.searchParams.get("pgbouncer") === "true";
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", pooled ? "1" : "5");
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", "10");
    }
    return url.toString();
  } catch {
    return raw;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaPoolGen?: number;
};

if (globalForPrisma.prisma && globalForPrisma.prismaPoolGen !== PRISMA_POOL_GEN) {
  void globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
}

const url = prismaUrl();
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(url ? { datasources: { db: { url } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaPoolGen = PRISMA_POOL_GEN;
}
