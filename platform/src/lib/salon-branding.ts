/** Client + server helpers for splash / shell salon branding. */

export const SALON_BRAND_KEY_PREFIX = "salon-brand:";
/** Last salon seen on this device (booking/display visits). */
export const SALON_BRAND_LAST_KEY = "salon-brand:last";
/** Last manager/stylist session salon — must not follow booking/display visits. */
export const SALON_BRAND_STAFF_KEY = "salon-brand:staff";

export type SalonBrand = {
  slug: string;
  name: string;
  address?: string | null;
  brandColor?: string | null;
  accentColor?: string | null;
  /** Theme pack ids so the boot script can paint the right palette immediately. */
  bookingThemeId?: string | null;
  managerThemeId?: string | null;
  stylistThemeId?: string | null;
};

/** Plain JSON clone — Prisma rows cannot be passed into client components. */
export function toClientSalonBrand(
  brand: Partial<SalonBrand> | null | undefined
): SalonBrand | null {
  if (!brand?.slug || !brand?.name) return null;
  return {
    slug: brand.slug,
    name: brand.name,
    address: brand.address ?? null,
    brandColor: brand.brandColor ?? null,
    accentColor: brand.accentColor ?? null,
    bookingThemeId: brand.bookingThemeId ?? null,
    managerThemeId: brand.managerThemeId ?? null,
    stylistThemeId: brand.stylistThemeId ?? null,
  };
}

/** Split "Demo Hair Studio" → lead "Demo" + accent "Hair Studio" for header mark. */
export function splitBrandName(name: string): { lead: string; rest: string | null } {
  const trimmed = (name || "").trim();
  if (!trimmed) return { lead: "Salon", rest: null };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { lead: parts[0], rest: null };
  return { lead: parts[0], rest: parts.slice(1).join(" ") };
}

/**
 * Short location line for chrome (e.g. "DUNDAS, ON" from a full street address).
 * Returns null when address is missing.
 */
export function locationEyebrow(address: string | null | undefined): string | null {
  if (!address?.trim()) return null;
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    const city = parts[parts.length - 2];
    const regionRaw = parts[parts.length - 1];
    // "ON L9H 7A2" → "ON"; "Ontario" stays as-is
    const region = regionRaw.replace(/\b[A-Z]\d[A-Z]\s*\d[A-Z]\d\b/gi, "").trim() || regionRaw;
    const prov = region.split(/\s+/)[0] || region;
    if (city && prov) return `${city}, ${prov}`.toUpperCase();
  }
  return address.trim().toUpperCase();
}

/** Extract tenant slug from `/book/:slug` or `/display/:slug` paths. */
export function slugFromPathname(pathname: string): string | null {
  const m = (pathname || "").match(/^\/(book|display)\/([^/]+)/i);
  if (!m?.[2]) return null;
  try {
    return decodeURIComponent(m[2]);
  } catch {
    return m[2];
  }
}

/** Fallback label when cache/API are unavailable (never hardcode FHSalon). */
export function humanizeSlug(slug: string): string {
  const s = (slug || "").trim();
  if (!s) return "Salon";
  const parts = s.split(/[-_]+/).filter(Boolean);
  if (parts.length > 1) {
    return parts
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join(" ");
  }
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function readSalonBrand(slug: string | null | undefined): SalonBrand | null {
  if (!slug || typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SALON_BRAND_KEY_PREFIX + slug);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SalonBrand;
    if (!parsed?.name || !parsed?.slug) return null;
    return parsed;
  } catch {
    return null;
  }
}

function parseBrand(raw: string | null): SalonBrand | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SalonBrand;
    if (!parsed?.name || !parsed?.slug) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readLastSalonBrand(): SalonBrand | null {
  if (typeof window === "undefined") return null;
  return parseBrand(localStorage.getItem(SALON_BRAND_LAST_KEY));
}

export function readStaffSalonBrand(): SalonBrand | null {
  if (typeof window === "undefined") return null;
  return parseBrand(localStorage.getItem(SALON_BRAND_STAFF_KEY));
}

export function writeSalonBrand(brand: SalonBrand, opts?: { staff?: boolean }): void {
  if (typeof window === "undefined" || !brand?.slug || !brand?.name) return;
  try {
    // Merge with existing cache so callers that omit theme ids (booking/display)
    // do not wipe manager/stylist packs used by the boot script.
    const prev = readSalonBrand(brand.slug);
    const sameSalon = prev?.slug === brand.slug ? prev : null;
    const payload = JSON.stringify({
      slug: brand.slug,
      name: brand.name,
      address: brand.address ?? sameSalon?.address ?? null,
      brandColor: brand.brandColor ?? sameSalon?.brandColor ?? null,
      accentColor: brand.accentColor ?? sameSalon?.accentColor ?? null,
      bookingThemeId: brand.bookingThemeId ?? sameSalon?.bookingThemeId ?? null,
      managerThemeId: brand.managerThemeId ?? sameSalon?.managerThemeId ?? null,
      stylistThemeId: brand.stylistThemeId ?? sameSalon?.stylistThemeId ?? null,
    });
    localStorage.setItem(SALON_BRAND_KEY_PREFIX + brand.slug, payload);
    localStorage.setItem(SALON_BRAND_LAST_KEY, payload);
    if (opts?.staff) {
      localStorage.setItem(SALON_BRAND_STAFF_KEY, payload);
    }
  } catch {
    /* private mode */
  }
}

/**
 * Immediate splash label: explicit name → cache for slug → staff session → last visit → "Salon".
 */
export function resolveSplashName(opts?: {
  brandName?: string | null;
  slug?: string | null;
  pathname?: string;
}): string {
  if (opts?.brandName?.trim()) return opts.brandName.trim();
  const slug = opts?.slug || (opts?.pathname ? slugFromPathname(opts.pathname) : null);
  const cached = readSalonBrand(slug);
  if (cached?.name) return cached.name;
  if (slug) return humanizeSlug(slug);
  const staff = readStaffSalonBrand();
  if (staff?.name) return staff.name;
  const last = readLastSalonBrand();
  if (last?.name) return last.name;
  return "Salon";
}
