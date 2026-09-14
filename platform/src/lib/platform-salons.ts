import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { MARKETPLACE_BOOK_THEME_ID } from "@/lib/marketplace-book-theme";
import {
  DEFAULT_MANAGER_THEME_ID,
  DEFAULT_STYLIST_THEME_ID,
  getSalonTheme,
  normalizeThemeId,
} from "./salon-themes";
import {
  normalizeBusinessType,
  normalizeListingStatus,
  type BusinessTypeId,
  type ListingStatus,
} from "./marketplace";

export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "book",
  "claim",
  "demo",
  "display",
  "explore",
  "manager",
  "platform",
  "shells",
  "stylist",
]);

export function normalizeSlug(raw: unknown) {
  return String(raw ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function validateSlug(slug: string) {
  if (slug.length < 3 || slug.length > 40) {
    return "Slug must be 3–40 characters (letters, numbers, dashes).";
  }
  if (RESERVED_SLUGS.has(slug)) return `"${slug}" is reserved by the platform.`;
  return null;
}

export function validateHours(openHour: number, closeHour: number, slotMinutes: number) {
  if (!Number.isFinite(openHour) || openHour < 0 || openHour > 23) {
    return "Open hour must be between 0 and 23.";
  }
  if (!Number.isFinite(closeHour) || closeHour < 1 || closeHour > 24) {
    return "Close hour must be between 1 and 24.";
  }
  if (openHour >= closeHour) return "Open hour must be before close hour.";
  if (![15, 20, 30, 45, 60].includes(slotMinutes)) {
    return "Slot length must be 15, 20, 30, 45, or 60 minutes.";
  }
  return null;
}

/**
 * Salon staff sign in with email only (no slug), so a manager address has to be
 * unique across every tenant or the wrong salon would open.
 */
export async function emailTakenByOtherSalon(email: string, salonId?: string) {
  const existing = await prisma.user.findFirst({
    where: { email: email.toLowerCase().trim() },
    select: { salonId: true },
  });
  if (!existing) return false;
  return existing.salonId !== salonId;
}

const STARTER_SERVICES = [
  { name: "Women's haircut & style", category: "WOMEN", durationMin: 60, priceCents: 6500, sortOrder: 1 },
  { name: "Trim & tidy", category: "WOMEN", durationMin: 30, priceCents: 3500, sortOrder: 2 },
  { name: "Men's haircut", category: "MEN", durationMin: 30, priceCents: 3000, sortOrder: 3 },
  { name: "Fade / taper", category: "MEN", durationMin: 45, priceCents: 4000, sortOrder: 4 },
];

export type CreateSalonInput = {
  name: string;
  slug: string;
  timezone: string;
  openHour: number;
  closeHour: number;
  slotMinutes: number;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  /** Ignored — client booking app is always cocoa gold luxury. */
  bookingThemeId?: string;
  managerThemeId: string;
  stylistThemeId: string;
  managerName: string;
  managerEmail: string;
  managerPassword: string;
  starterMenu: boolean;
  /** Marketplace listing — operator creates PUBLISHED; self-serve uses DRAFT. */
  listingStatus?: ListingStatus;
  businessType?: BusinessTypeId;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  description?: string | null;
  coverData?: Uint8Array<ArrayBuffer> | null;
  coverMime?: string | null;
  active?: boolean;
  claimedAt?: Date | null;
};

/** Creates the tenant plus a usable manager login (and optionally a bookable starter menu). */
export async function createSalonWithManager(input: CreateSalonInput) {
  const passwordHash = await bcrypt.hash(input.managerPassword, 10);

  const bookingTheme = getSalonTheme(MARKETPLACE_BOOK_THEME_ID, MARKETPLACE_BOOK_THEME_ID);
  const listingStatus = normalizeListingStatus(input.listingStatus ?? "PUBLISHED");
  const businessType = normalizeBusinessType(input.businessType ?? "SALON");
  const active = input.active ?? listingStatus === "PUBLISHED";

  const salon = await prisma.salon.create({
    data: {
      name: input.name,
      slug: input.slug,
      timezone: input.timezone,
      openHour: input.openHour,
      closeHour: input.closeHour,
      slotMinutes: input.slotMinutes,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      bookingThemeId: MARKETPLACE_BOOK_THEME_ID,
      managerThemeId: DEFAULT_MANAGER_THEME_ID,
      stylistThemeId: DEFAULT_STYLIST_THEME_ID,
      // Legacy splash/API fields — keep in sync with booking pack accent.
      brandColor: bookingTheme.dark.accent,
      accentColor: bookingTheme.dark.accentStrong,
      listingStatus,
      businessType,
      city: input.city?.trim() || null,
      region: input.region?.trim() || null,
      country: input.country?.trim() || "CA",
      description: input.description?.trim() || null,
      coverData: input.coverData ?? null,
      coverMime: input.coverMime ?? null,
      coverUpdatedAt: input.coverData?.length ? new Date() : null,
      active,
      claimedAt: input.claimedAt ?? null,
      approvedAt: listingStatus === "PUBLISHED" ? new Date() : null,
    },
  });

  await prisma.user.create({
    data: {
      salonId: salon.id,
      email: input.managerEmail.toLowerCase().trim(),
      passwordHash,
      name: input.managerName,
      role: "ADMIN", // Manager portal (ADMIN kept for parity with existing accounts)
    },
  });

  if (input.starterMenu) {
    const stylist = await prisma.stylist.create({
      data: {
        salonId: salon.id,
        name: "Lead provider",
        bio: "Update this profile from the manager portal.",
        color: getSalonTheme(input.managerThemeId, DEFAULT_MANAGER_THEME_ID).light.accent,
      },
    });

    for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
      await prisma.stylistWeekHour.create({
        data: {
          stylistId: stylist.id,
          dayOfWeek,
          startHour: salon.openHour,
          endHour: salon.closeHour,
          isOff: dayOfWeek === 0,
        },
      });
    }

    for (const service of STARTER_SERVICES) {
      const row = await prisma.service.create({ data: { salonId: salon.id, ...service } });
      await prisma.stylistService.create({
        data: { stylistId: stylist.id, serviceId: row.id },
      });
    }
  }

  return salon;
}
