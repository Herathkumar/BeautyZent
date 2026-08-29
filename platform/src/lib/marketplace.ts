/** Marketplace verticals and listing helpers (BeautyZent / SalonBook). */

export const BUSINESS_TYPES = [
  { id: "SALON", label: "Hair salon" },
  { id: "BARBER", label: "Barbershop" },
  { id: "SPA", label: "Spa & wellness" },
  { id: "NAILS", label: "Nails" },
  { id: "OTHER", label: "Other beauty & personal care" },
] as const;

export type BusinessTypeId = (typeof BUSINESS_TYPES)[number]["id"];

export const LISTING_STATUSES = ["DRAFT", "PUBLISHED", "REJECTED"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export function normalizeBusinessType(raw: unknown): BusinessTypeId {
  const v = String(raw ?? "SALON").toUpperCase();
  if (BUSINESS_TYPES.some((t) => t.id === v)) return v as BusinessTypeId;
  return "SALON";
}

export function businessTypeLabel(id: string | null | undefined) {
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
  switch (normalizeBusinessType(businessType || "SALON")) {
    case "BARBER":
      return "barber";
    case "SPA":
      return "therapist";
    case "NAILS":
      return "technician";
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
