import { prisma } from "@/lib/prisma";

export type SalonLookListRow = {
  id: string;
  styleNumber: number;
  title: string;
  category: string;
  description: string | null;
  beforeMime: string | null;
  afterMime: string | null;
  updatedAt: Date;
};

export type SalonLookImageRow = {
  active: boolean;
  beforeData: Buffer | Uint8Array | null;
  beforeMime: string | null;
  afterData: Buffer | Uint8Array | null;
  afterMime: string | null;
};

function isMissingSalonLookTable(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return (
    msg.includes('relation "SalonLook" does not exist') ||
    msg.includes("42P01") ||
    (typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2010" &&
      msg.includes("SalonLook"))
  );
}

/**
 * SalonLook access via SQL so lounge keeps working even when a stale
 * PrismaClient singleton is missing the `salonLook` delegate (common after
 * schema adds while `next dev` holds the Windows query engine DLL).
 */
export async function listActiveSalonLooks(salonId: string): Promise<SalonLookListRow[]> {
  try {
    return await prisma.$queryRaw<SalonLookListRow[]>`
      SELECT
        id,
        "styleNumber",
        title,
        category,
        description,
        "beforeMime",
        "afterMime",
        "updatedAt"
      FROM "SalonLook"
      WHERE "salonId" = ${salonId}
        AND active = true
      ORDER BY "sortOrder" ASC, "styleNumber" ASC
    `;
  } catch (err) {
    if (isMissingSalonLookTable(err)) {
      console.warn("[salon-looks] SalonLook table missing — run prisma db push");
      return [];
    }
    throw err;
  }
}

export async function getSalonLookImage(id: string): Promise<SalonLookImageRow | null> {
  try {
    const rows = await prisma.$queryRaw<SalonLookImageRow[]>`
      SELECT
        active,
        "beforeData",
        "beforeMime",
        "afterData",
        "afterMime"
      FROM "SalonLook"
      WHERE id = ${id}
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch (err) {
    if (isMissingSalonLookTable(err)) {
      console.warn("[salon-looks] SalonLook table missing — run prisma db push");
      return null;
    }
    throw err;
  }
}
