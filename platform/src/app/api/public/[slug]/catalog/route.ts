import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { linkOrphanServicesToAllStylists } from "@/lib/service-links";
import { serviceImageUrl } from "@/lib/service-image";
import { stylistPhotoUrl } from "@/lib/stylist-photo";
import { isE2eFixtureStylist } from "@/lib/display-schedule";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    include: {
      services: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          durationMin: true,
          priceCents: true,
          sortOrder: true,
          imageMime: true,
          imageUpdatedAt: true,
        },
      },
    },
  });
  // Paused salons (platform console) stay invisible to public booking.
  if (!salon || !salon.active) {
    return NextResponse.json({ error: "Salon not found" }, { status: 404, headers: CORS_HEADERS });
  }

  // Heal orphans only — do not mesh every service onto every stylist (specialty menus).
  await linkOrphanServicesToAllStylists(salon.id);

  const stylists = await prisma.stylist.findMany({
    where: { salonId: salon.id, active: true },
    select: {
      id: true,
      name: true,
      bio: true,
      color: true,
      gender: true,
      photoUpdatedAt: true,
      photoMime: true,
      googleRefreshToken: true,
      services: { select: { serviceId: true } },
    },
    orderBy: { name: "asc" },
  });

  const services = salon.services.map((s) => {
    const hasImage = Boolean(s.imageUpdatedAt && s.imageMime);
    return {
      id: s.id,
      name: s.name,
      description: s.description,
      category: s.category,
      durationMin: s.durationMin,
      priceCents: s.priceCents,
      sortOrder: s.sortOrder,
      hasImage,
      imageUrl: serviceImageUrl({
        id: s.id,
        hasImage,
        imageUpdatedAt: s.imageUpdatedAt,
      }),
    };
  });
  const women = services.filter((s) => s.category === "WOMEN");
  const men = services.filter((s) => s.category === "MEN");
  const other = services.filter((s) => s.category !== "WOMEN" && s.category !== "MEN");

  return NextResponse.json(
    {
      salon: {
        id: salon.id,
        name: salon.name,
        slug: salon.slug,
        phone: salon.phone,
        address: salon.address,
        timezone: salon.timezone,
        openHour: salon.openHour,
        closeHour: salon.closeHour,
        today: new Intl.DateTimeFormat("en-CA", {
          timeZone: salon.timezone || "America/Toronto",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date()),
      },
      services,
      servicesByCategory: { women, men, other },
      stylists: stylists
        .filter((s) => !isE2eFixtureStylist(s))
        .map((s) => {
        const hasPhoto = Boolean(s.photoUpdatedAt && s.photoMime);
        return {
          id: s.id,
          name: s.name,
          bio: s.bio,
          color: s.color,
          gender: s.gender,
          hasPhoto,
          photoUrl: stylistPhotoUrl({
            id: s.id,
            gender: s.gender,
            hasPhoto,
            photoUpdatedAt: s.photoUpdatedAt,
          }),
          serviceIds: s.services.map((x) => x.serviceId),
          calendarConnected: Boolean(s.googleRefreshToken),
        };
      }),
    },
    { headers: CORS_HEADERS }
  );
}
