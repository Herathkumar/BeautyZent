import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "STYLIST" || !session.stylistId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stylist = await prisma.stylist.findUnique({
    where: { id: session.stylistId },
    include: { salon: { select: { name: true, slug: true, phone: true } } },
  });
  if (!stylist) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    user: {
      name: session.name,
      email: session.email,
      role: session.role,
    },
    stylist: {
      id: stylist.id,
      name: stylist.name,
      bio: stylist.bio,
      color: stylist.color,
      salon: stylist.salon,
    },
  });
}
