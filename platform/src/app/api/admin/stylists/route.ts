import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGoogleAuthUrl, isGoogleConfigured } from "@/lib/calendar";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const stylists = await prisma.stylist.findMany({
    where: { salonId: session.salonId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    googleConfigured: isGoogleConfigured(),
    stylists: stylists.map((s) => ({
      id: s.id,
      name: s.name,
      bio: s.bio,
      color: s.color,
      active: s.active,
      calendarConnected: Boolean(s.googleRefreshToken),
      googleConnectedAt: s.googleConnectedAt,
      connectUrl: getGoogleAuthUrl(s.id),
    })),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const stylist = await prisma.stylist.create({
    data: {
      salonId: session.salonId,
      name: body.name,
      bio: body.bio || null,
      color: body.color || "#6e4a38",
      active: true,
    },
  });
  return NextResponse.json({ stylist });
}
