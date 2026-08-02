import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
        include: { services: { select: { serviceId: true } } },
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
      openHour: salon.openHour,
      closeHour: salon.closeHour,
    },
    services: salon.services,
    stylists: salon.stylists.map((s) => ({
      id: s.id,
      name: s.name,
      bio: s.bio,
      color: s.color,
      serviceIds: s.services.map((x) => x.serviceId),
      calendarConnected: Boolean(s.googleRefreshToken),
    })),
  });
}
