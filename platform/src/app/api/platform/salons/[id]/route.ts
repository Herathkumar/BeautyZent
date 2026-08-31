import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { normalizeCustomerDisplayView, normalizeCustomerDisplayViewControl, normalizeCustomerDisplayViewRotateSec } from "@/lib/customer-display-view";
import { getPlatformSession } from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";
import {
  emailTakenByOtherSalon,
  normalizeSlug,
  validateHours,
  validateSlug,
} from "@/lib/platform-salons";
import {
  normalizeBusinessType,
  normalizeListingStatus,
} from "@/lib/marketplace";
import {
  DEFAULT_BOOKING_THEME_ID,
  DEFAULT_MANAGER_THEME_ID,
  DEFAULT_STYLIST_THEME_ID,
  getSalonTheme,
  normalizeThemeId,
} from "@/lib/salon-themes";

const DAYS = new Set([0, 1, 2, 3, 4, 5, 6]);

const SALON_SELECT = {
  id: true,
  name: true,
  slug: true,
  active: true,
  listingStatus: true,
  businessType: true,
  city: true,
  region: true,
  country: true,
  description: true,
  phone: true,
  email: true,
  address: true,
  timezone: true,
  openHour: true,
  closeHour: true,
  closedDays: true,
  slotMinutes: true,
  bookingThemeId: true,
  managerThemeId: true,
  stylistThemeId: true,
  displayViewMode: true,
  displayViewControl: true,
  displayViewRotateSec: true,
  loungeDisplayEnabled: true,
  schedulerDisplayEnabled: true,
  claimedAt: true,
  approvedAt: true,
  listingReviewNote: true,
  listingReviewedAt: true,
  createdAt: true,
  _count: { select: { stylists: true, services: true, appointments: true, clients: true } },
} as const;

async function loadSalon(id: string) {
  const salon = await prisma.salon.findUnique({ where: { id }, select: SALON_SELECT });
  if (!salon) return null;
  const staff = await prisma.user.findMany({
    where: { salonId: id },
    orderBy: [{ role: "asc" }, { email: "asc" }],
    select: { id: true, email: true, name: true, role: true },
  });
  return { salon, staff };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPlatformSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await loadSalon(id);
  if (!data) return NextResponse.json({ error: "Salon not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPlatformSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const current = await prisma.salon.findUnique({ where: { id }, select: { id: true, slug: true } });
  if (!current) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  if (name.length < 2) return NextResponse.json({ error: "Salon name is required." }, { status: 400 });

  const slug = normalizeSlug(body.slug ?? current.slug);
  const slugError = validateSlug(slug);
  if (slugError) return NextResponse.json({ error: slugError }, { status: 400 });
  if (slug !== current.slug) {
    const taken = await prisma.salon.findUnique({ where: { slug }, select: { id: true } });
    if (taken) return NextResponse.json({ error: `Slug "${slug}" is already taken.` }, { status: 409 });
  }

  const openHour = Math.round(Number(body.openHour));
  const closeHour = Math.round(Number(body.closeHour));
  const slotMinutes = Math.round(Number(body.slotMinutes));
  const hoursError = validateHours(openHour, closeHour, slotMinutes);
  if (hoursError) return NextResponse.json({ error: hoursError }, { status: 400 });

  const closedDaysRaw = Array.isArray(body.closedDays) ? body.closedDays : [0];
  const closedDays = [
    ...new Set(
      closedDaysRaw.map((d) => Math.round(Number(d))).filter((d) => Number.isFinite(d) && DAYS.has(d))
    ),
  ].sort((a, b) => a - b);
  if (closedDays.length === 7) {
    return NextResponse.json({ error: "The salon cannot be closed every day." }, { status: 400 });
  }

  // Optional manager reset in the same save.
  const managerEmail = body.managerEmail ? String(body.managerEmail).toLowerCase().trim() : "";
  const managerPassword = body.managerPassword ? String(body.managerPassword) : "";
  if (managerEmail || managerPassword) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(managerEmail)) {
      return NextResponse.json({ error: "A valid manager email is required." }, { status: 400 });
    }
    if (managerPassword.length < 8) {
      return NextResponse.json(
        { error: "Manager password must be at least 8 characters." },
        { status: 400 }
      );
    }
    if (await emailTakenByOtherSalon(managerEmail, id)) {
      return NextResponse.json(
        { error: "That manager email already belongs to another salon login." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(managerPassword, 10);
    await prisma.user.upsert({
      where: { salonId_email: { salonId: id, email: managerEmail } },
      update: { passwordHash, role: "ADMIN" },
      create: {
        salonId: id,
        email: managerEmail,
        passwordHash,
        name: String(body.managerName || "Salon Manager").trim(),
        role: "ADMIN",
      },
    });
  }

  const bookingThemeId = normalizeThemeId(body.bookingThemeId, DEFAULT_BOOKING_THEME_ID);
  const managerThemeId = normalizeThemeId(body.managerThemeId, DEFAULT_MANAGER_THEME_ID);
  const stylistThemeId = normalizeThemeId(body.stylistThemeId, DEFAULT_STYLIST_THEME_ID);
  const bookingTheme = getSalonTheme(bookingThemeId, DEFAULT_BOOKING_THEME_ID);

  const listingStatus =
    body.listingStatus != null
      ? normalizeListingStatus(body.listingStatus)
      : undefined;
  const businessType =
    body.businessType != null ? normalizeBusinessType(body.businessType) : undefined;

  const approving = listingStatus === "PUBLISHED";

  await prisma.salon.update({
    where: { id },
    data: {
      name,
      slug,
      active: body.active !== false,
      phone: body.phone ? String(body.phone).trim() : null,
      email: body.email ? String(body.email).trim() : null,
      address: body.address ? String(body.address).trim() : null,
      timezone: String(body.timezone || "America/Toronto"),
      openHour,
      closeHour,
      closedDays,
      slotMinutes,
      bookingThemeId,
      managerThemeId,
      stylistThemeId,
      displayViewMode: normalizeCustomerDisplayView(body.displayViewMode),
      displayViewControl: normalizeCustomerDisplayViewControl(body.displayViewControl),
      displayViewRotateSec: normalizeCustomerDisplayViewRotateSec(body.displayViewRotateSec),
      loungeDisplayEnabled: body.loungeDisplayEnabled !== false,
      schedulerDisplayEnabled: body.schedulerDisplayEnabled !== false,
      brandColor: bookingTheme.dark.accent,
      accentColor: bookingTheme.dark.accentStrong,
      ...(listingStatus
        ? {
            listingStatus,
            ...(approving
              ? { approvedAt: new Date(), approvedById: session.adminId ?? session.email ?? null }
              : {}),
            ...(listingStatus === "PUBLISHED" && body.active !== false ? { active: true } : {}),
          }
        : {}),
      ...(businessType ? { businessType } : {}),
      ...(body.city !== undefined
        ? { city: body.city ? String(body.city).trim() : null }
        : {}),
      ...(body.region !== undefined
        ? { region: body.region ? String(body.region).trim() : null }
        : {}),
      ...(body.country !== undefined
        ? { country: body.country ? String(body.country).trim() : null }
        : {}),
      ...(body.description !== undefined
        ? { description: body.description ? String(body.description).trim() : null }
        : {}),
    },
  });

  const data = await loadSalon(id);
  return NextResponse.json({ ...data, message: "Business saved." });
}
