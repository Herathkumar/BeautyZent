import { NextResponse } from "next/server";
import { getSession, isSalonStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || !isSalonStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const salon = await prisma.salon.findUnique({
    where: { id: session.salonId },
    select: {
      id: true,
      name: true,
      slug: true,
      timezone: true,
      openHour: true,
      closeHour: true,
      slotMinutes: true,
    },
  });
  if (!salon) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ salon });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || !isSalonStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const openHour = Math.round(Number(body.openHour));
  const closeHour = Math.round(Number(body.closeHour));
  if (
    !Number.isFinite(openHour) ||
    !Number.isFinite(closeHour) ||
    openHour < 0 ||
    openHour > 23 ||
    closeHour < 1 ||
    closeHour > 24 ||
    openHour >= closeHour
  ) {
    return NextResponse.json(
      { error: "Open hour must be before close hour (0–23 / 1–24)." },
      { status: 400 }
    );
  }

  const salon = await prisma.salon.update({
    where: { id: session.salonId },
    data: { openHour, closeHour },
    select: {
      id: true,
      name: true,
      openHour: true,
      closeHour: true,
      timezone: true,
    },
  });

  return NextResponse.json({
    salon,
    message:
      "Store hours saved. New stylists will get these hours by default. Existing stylist schedules are unchanged.",
  });
}
