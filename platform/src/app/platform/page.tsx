import { redirect } from "next/navigation";
import { getPlatformSession } from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";
import { HousesDirectory } from "./HousesDirectory";

export const dynamic = "force-dynamic";

export default async function PlatformHomePage() {
  const session = await getPlatformSession();
  if (!session) redirect("/explore");

  const salons = await prisma.salon.findMany({
    // Keep cards in a stable position when Pause / Resume reloads this page.
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      active: true,
      listingStatus: true,
      businessType: true,
      openHour: true,
      closeHour: true,
      coverUpdatedAt: true,
      coverMime: true,
      _count: { select: { stylists: true, services: true, appointments: true } },
    },
  });

  const houses = salons.map((salon) => ({
    id: salon.id,
    name: salon.name,
    slug: salon.slug,
    active: salon.active,
    listingStatus: salon.listingStatus,
    businessType: salon.businessType,
    openHour: salon.openHour,
    closeHour: salon.closeHour,
    coverUrl:
      salon.coverUpdatedAt || salon.coverMime
        ? `/api/public/cover/${salon.id}?v=${salon.coverUpdatedAt?.getTime() ?? 0}`
        : null,
    providers: salon._count.stylists,
    services: salon._count.services,
    bookings: salon._count.appointments,
  }));

  return <HousesDirectory houses={houses} />;
}
