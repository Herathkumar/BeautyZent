import { prisma } from "@/lib/prisma";

/** Link a service to every active stylist in the salon (skip existing links). */
export async function linkServiceToAllStylists(salonId: string, serviceId: string) {
  const stylists = await prisma.stylist.findMany({
    where: { salonId, active: true },
    select: { id: true },
  });
  if (stylists.length === 0) return 0;
  const result = await prisma.stylistService.createMany({
    data: stylists.map((s) => ({ stylistId: s.id, serviceId })),
    skipDuplicates: true,
  });
  return result.count;
}

/** Link a stylist to every active service in the salon (skip existing links). */
export async function linkStylistToAllServices(salonId: string, stylistId: string) {
  const services = await prisma.service.findMany({
    where: { salonId, active: true },
    select: { id: true },
  });
  if (services.length === 0) return 0;
  const result = await prisma.stylistService.createMany({
    data: services.map((s) => ({ stylistId, serviceId: s.id })),
    skipDuplicates: true,
  });
  return result.count;
}

/**
 * Link only orphan services (zero stylists) to every active stylist.
 * Preserves intentional specialty menus (e.g. Aisha women-only, Omar men-only).
 */
export async function linkOrphanServicesToAllStylists(salonId: string) {
  const [stylists, orphans] = await Promise.all([
    prisma.stylist.findMany({ where: { salonId, active: true }, select: { id: true } }),
    prisma.service.findMany({
      where: { salonId, active: true, stylists: { none: {} } },
      select: { id: true },
    }),
  ]);
  if (stylists.length === 0 || orphans.length === 0) return 0;
  const data = orphans.flatMap((service) =>
    stylists.map((stylist) => ({ stylistId: stylist.id, serviceId: service.id }))
  );
  const result = await prisma.stylistService.createMany({ data, skipDuplicates: true });
  return result.count;
}

/** @deprecated Prefer linkOrphanServicesToAllStylists — full mesh breaks specialty menus. */
export async function syncAllServiceStylistLinks(salonId: string) {
  return linkOrphanServicesToAllStylists(salonId);
}
