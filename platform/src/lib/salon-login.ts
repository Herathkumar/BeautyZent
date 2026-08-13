import { prisma } from "@/lib/prisma";

export async function salonLoginContext(slug: string | undefined | null) {
  const s = (slug || "").trim().toLowerCase();
  if (!s) return null;
  return prisma.salon.findUnique({
    where: { slug: s },
    select: {
      id: true,
      name: true,
      slug: true,
      users: {
        select: { email: true, name: true, role: true, stylistId: true },
        orderBy: [{ role: "asc" }, { name: "asc" }],
      },
    },
  });
}
