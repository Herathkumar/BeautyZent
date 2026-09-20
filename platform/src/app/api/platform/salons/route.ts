import { NextResponse } from "next/server";
import { getPlatformSession } from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";
import {
  createSalonWithManager,
  emailTakenByOtherSalon,
  normalizeSlug,
  validateHours,
  validateSlug,
} from "@/lib/platform-salons";
import { normalizeBusinessType } from "@/lib/marketplace";
import {
  DEFAULT_MANAGER_THEME_ID,
  DEFAULT_STYLIST_THEME_ID,
} from "@/lib/salon-themes";
import { MARKETPLACE_BOOK_THEME_ID } from "@/lib/marketplace-book-theme";

export async function GET() {
  const session = await getPlatformSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const salons = await prisma.salon.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      active: true,
      timezone: true,
      openHour: true,
      closeHour: true,
      bookingThemeId: true,
      managerThemeId: true,
      stylistThemeId: true,
      createdAt: true,
      _count: { select: { stylists: true, services: true, appointments: true, users: true } },
    },
  });

  return NextResponse.json({ salons });
}

export async function POST(req: Request) {
  const session = await getPlatformSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  if (name.length < 2) {
    return NextResponse.json({ error: "House name is required." }, { status: 400 });
  }

  const slug = normalizeSlug(body.slug || name);
  const slugError = validateSlug(slug);
  if (slugError) return NextResponse.json({ error: slugError }, { status: 400 });

  const existing = await prisma.salon.findUnique({ where: { slug }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: `Slug "${slug}" is already taken.` }, { status: 409 });
  }

  const openHour = Math.round(Number(body.openHour ?? 9));
  const closeHour = Math.round(Number(body.closeHour ?? 18));
  const slotMinutes = Math.round(Number(body.slotMinutes ?? 30));
  const hoursError = validateHours(openHour, closeHour, slotMinutes);
  if (hoursError) return NextResponse.json({ error: hoursError }, { status: 400 });

  const managerEmail = String(body.managerEmail ?? "").toLowerCase().trim();
  const managerPassword = String(body.managerPassword ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(managerEmail)) {
    return NextResponse.json({ error: "A valid manager email is required." }, { status: 400 });
  }
  if (managerPassword.length < 8) {
    return NextResponse.json(
      { error: "Manager password must be at least 8 characters." },
      { status: 400 }
    );
  }
  if (await emailTakenByOtherSalon(managerEmail)) {
    return NextResponse.json(
      { error: "That manager email already belongs to another house login." },
      { status: 409 }
    );
  }

  const businessType = normalizeBusinessType(body.businessType ?? "SALON");

  const salon = await createSalonWithManager({
    name,
    slug,
    timezone: String(body.timezone || "America/Toronto"),
    openHour,
    closeHour,
    slotMinutes,
    phone: body.phone ? String(body.phone).trim() : null,
    email: body.email ? String(body.email).trim() : null,
    address: body.address ? String(body.address).trim() : null,
    bookingThemeId: MARKETPLACE_BOOK_THEME_ID,
    managerThemeId: DEFAULT_MANAGER_THEME_ID,
    stylistThemeId: DEFAULT_STYLIST_THEME_ID,
    managerName: String(body.managerName || "House manager").trim(),
    managerEmail,
    managerPassword,
    starterMenu: body.starterMenu !== false,
    businessType,
  });

  return NextResponse.json({ salon: { id: salon.id, slug: salon.slug, name: salon.name } }, { status: 201 });
}
