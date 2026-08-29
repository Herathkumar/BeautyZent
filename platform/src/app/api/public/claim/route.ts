import { NextResponse } from "next/server";
import { z } from "zod";
import {
  DEFAULT_BOOKING_THEME_ID,
  DEFAULT_MANAGER_THEME_ID,
  DEFAULT_STYLIST_THEME_ID,
} from "@/lib/salon-themes";
import {
  createSalonWithManager,
  emailTakenByOtherSalon,
  normalizeSlug,
  validateHours,
  validateSlug,
} from "@/lib/platform-salons";
import { BUSINESS_TYPES, normalizeBusinessType } from "@/lib/marketplace";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  businessName: z.string().min(2).max(80),
  slug: z.string().min(3).max(40),
  businessType: z.string().optional(),
  city: z.string().min(2).max(80),
  region: z.string().max(80).optional(),
  country: z.string().max(8).optional(),
  description: z.string().max(500).optional(),
  phone: z.string().max(40).optional(),
  address: z.string().max(200).optional(),
  timezone: z.string().min(3).max(64).default("America/Toronto"),
  openHour: z.number().int().min(0).max(23).default(9),
  closeHour: z.number().int().min(1).max(24).default(18),
  slotMinutes: z.number().int().default(30),
  managerName: z.string().min(2).max(80),
  managerEmail: z.string().email(),
  managerPassword: z.string().min(8).max(128),
});

/**
 * Self-serve create business (marketplace claim).
 * Creates tenant as DRAFT + paused until platform approves.
 */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the form — name, city, slug, and manager login are required." },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const slug = normalizeSlug(data.slug);
  const slugError = validateSlug(slug);
  if (slugError) return NextResponse.json({ error: slugError }, { status: 400 });

  const hoursError = validateHours(data.openHour, data.closeHour, data.slotMinutes);
  if (hoursError) return NextResponse.json({ error: hoursError }, { status: 400 });

  const taken = await prisma.salon.findUnique({ where: { slug }, select: { id: true } });
  if (taken) {
    return NextResponse.json({ error: `Slug "${slug}" is already taken.` }, { status: 409 });
  }

  const managerEmail = data.managerEmail.toLowerCase().trim();
  if (await emailTakenByOtherSalon(managerEmail)) {
    return NextResponse.json(
      { error: "That manager email is already used by another business." },
      { status: 409 }
    );
  }

  const businessType = normalizeBusinessType(data.businessType || "SALON");

  const salon = await createSalonWithManager({
    name: data.businessName.trim(),
    slug,
    timezone: data.timezone,
    openHour: data.openHour,
    closeHour: data.closeHour,
    slotMinutes: data.slotMinutes,
    phone: data.phone?.trim() || null,
    email: managerEmail,
    address: data.address?.trim() || null,
    bookingThemeId: DEFAULT_BOOKING_THEME_ID,
    managerThemeId: DEFAULT_MANAGER_THEME_ID,
    stylistThemeId: DEFAULT_STYLIST_THEME_ID,
    managerName: data.managerName.trim(),
    managerEmail,
    managerPassword: data.managerPassword,
    starterMenu: true,
    listingStatus: "DRAFT",
    active: false,
    businessType,
    city: data.city.trim(),
    region: data.region?.trim() || null,
    country: data.country?.trim() || "CA",
    description: data.description?.trim() || null,
    claimedAt: new Date(),
  });

  return NextResponse.json({
    ok: true,
    message:
      "Thanks — your business is pending review. You’ll get access to book once a platform admin publishes it.",
    business: {
      id: salon.id,
      name: salon.name,
      slug: salon.slug,
      listingStatus: salon.listingStatus,
      businessType: salon.businessType,
      types: BUSINESS_TYPES,
    },
  });
}
