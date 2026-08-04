import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "FRONT_DESK")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blocks = await prisma.stylistBlock.findMany({
    where: {
      status: "PENDING",
      stylist: { salonId: session.salonId },
      endsAt: { gte: new Date() },
    },
    include: {
      stylist: { select: { id: true, name: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  return NextResponse.json({ blocks });
}
