import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stylistPhotoUrl } from "@/lib/stylist-photo";

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
        orderBy: { sortOrder: "asc" },
      },
      stylists: {
        where: { active: true },
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
      },
    },
  });
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  return NextResponse.json({
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
    services: salon.services,
    stylists: salon.stylists.map((s) => {
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
  });
}
