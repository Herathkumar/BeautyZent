import { NextResponse } from "next/server";
import { assertDisplayAccess } from "@/lib/display-pin";
import { prisma } from "@/lib/prisma";
import { serviceImageUrl } from "@/lib/service-image";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      displayPinHash: true,
      displayPinSetAt: true,
    },
  });
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  const locked = await assertDisplayAccess(salon);
  if (locked) return locked;

  const services = await prisma.service.findMany({
    where: { salonId: salon.id, active: true },
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
  });

  const mapped = services.map((s) => {
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

  const women = mapped.filter((s) => s.category === "WOMEN");
  const men = mapped.filter((s) => s.category === "MEN");
  const other = mapped.filter((s) => s.category !== "WOMEN" && s.category !== "MEN");

  return NextResponse.json({
    salon: { id: salon.id, slug: salon.slug, name: salon.name },
    services: mapped,
    servicesByCategory: { women, men, other },
  });
}
