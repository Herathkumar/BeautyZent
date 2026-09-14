import { NextResponse } from "next/server";
import { assertDisplayAccess } from "@/lib/display-pin";
import { prisma } from "@/lib/prisma";
import { listActiveSalonLooks } from "@/lib/salon-look-db";
import { salonLookImageUrl } from "@/lib/salon-looks";

export async function GET(
  req: Request,
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

  const locked = await assertDisplayAccess(salon, req);
  if (locked) return locked;

  const looks = await listActiveSalonLooks(salon.id);

  return NextResponse.json({
    salon: { id: salon.id, slug: salon.slug, name: salon.name },
    looks: looks.map((look) => {
      const hasBefore = Boolean(look.beforeMime);
      const hasAfter = Boolean(look.afterMime);
      return {
        id: look.id,
        styleNumber: look.styleNumber,
        title: look.title,
        category: look.category,
        description: look.description,
        beforeUrl: salonLookImageUrl({
          id: look.id,
          side: "before",
          hasImage: hasBefore,
          updatedAt: look.updatedAt,
        }),
        afterUrl: salonLookImageUrl({
          id: look.id,
          side: "after",
          hasImage: hasAfter,
          updatedAt: look.updatedAt,
        }),
      };
    }),
  });
}
