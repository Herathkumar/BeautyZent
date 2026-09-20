/** Marketplace verticals and listing helpers (BeautyZent / SalonBook). */

export const BUSINESS_TYPES = [
  { id: "SALON", label: "Hair" },
  { id: "SKIN", label: "Skin" },
  { id: "NAILS", label: "Nails" },
  { id: "SPA", label: "Spa" },
  { id: "MEDSPA", label: "Medspa" },
  { id: "MAKEUP", label: "Makeup" },
  { id: "WELLNESS", label: "Wellness" },
  { id: "OTHER", label: "Other" },
] as const;

export type BusinessTypeId = (typeof BUSINESS_TYPES)[number]["id"];

export const LISTING_STATUSES = ["DRAFT", "PUBLISHED", "REJECTED"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export function normalizeBusinessType(raw: unknown): BusinessTypeId {
  const v = String(raw ?? "SALON").toUpperCase();
  if (v === "BARBER") return "SALON";
  if (BUSINESS_TYPES.some((t) => t.id === v)) return v as BusinessTypeId;
  return "OTHER";
}

export function businessTypeLabel(id: string | null | undefined) {
  if (String(id || "").toUpperCase() === "BARBER") return "Barber";
  const found = BUSINESS_TYPES.find((t) => t.id === id);
  return found?.label ?? "Business";
}

export function normalizeListingStatus(raw: unknown): ListingStatus {
  const v = String(raw ?? "DRAFT").toUpperCase();
  if ((LISTING_STATUSES as readonly string[]).includes(v)) return v as ListingStatus;
  return "DRAFT";
}

/** Live on the public marketplace directory. */
export function isPublicListing(salon: {
  active: boolean;
  listingStatus: string;
}) {
  return salon.active && salon.listingStatus === "PUBLISHED";
}

/** Provider-facing label by vertical (soften “stylist” for non-salons). */
export function providerLabel(businessType?: string | null) {
  const key = String(businessType || "SALON").toUpperCase();
  if (key === "BARBER") return "barber";
  switch (normalizeBusinessType(businessType || "SALON")) {
    case "SPA":
    case "WELLNESS":
    case "SKIN":
    case "MEDSPA":
      return "therapist";
    case "NAILS":
      return "technician";
    case "MAKEUP":
    case "OTHER":
      return "provider";
    default:
      return "stylist";
  }
}

export function providerLabelPlural(businessType?: string | null) {
  const one = providerLabel(businessType);
  if (one === "therapist") return "therapists";
  if (one === "technician") return "technicians";
  if (one === "barber") return "barbers";
  if (one === "provider") return "providers";
  return "stylists";
}
