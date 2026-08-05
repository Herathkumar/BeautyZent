import { NextResponse } from "next/server";
import { getSession, isSalonStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DAY_SET = new Set([0, 1, 2, 3, 4, 5, 6]);

function normalizeClosedDays(value: unknown): number[] | { error: string } {
  if (value == null) return [0];
  if (!Array.isArray(value)) {
    return { error: "Store off days must be a list of weekdays (0–6)." };
  }
  const days = [
    ...new Set(
      value
        .map((d) => Math.round(Number(d)))
        .filter((d) => Number.isFinite(d) && DAY_SET.has(d))
    ),
  ].sort((a, b) => a - b);
  if (days.length === 7) {
    return { error: "Pick at least one open day — the store cannot be closed every day." };
  }
  return days;
}

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
      closedDays: true,
      slotMinutes: true,
    },
  });
  if (!salon) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    salon: {
      ...salon,
      closedDays: salon.closedDays?.length ? salon.closedDays : [0],
    },
  });
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

  const closedDays = normalizeClosedDays(body.closedDays);
  if (!Array.isArray(closedDays)) {
    return NextResponse.json({ error: closedDays.error }, { status: 400 });
  }

  const salon = await prisma.salon.update({
    where: { id: session.salonId },
    data: { openHour, closeHour, closedDays },
    select: {
      id: true,
      name: true,
      openHour: true,
      closeHour: true,
      closedDays: true,
      timezone: true,
    },
  });

  return NextResponse.json({
    salon,
    message:
      "Store hours saved. New stylists will get these hours and off days by default. Existing stylist schedules are unchanged.",
  });
}
