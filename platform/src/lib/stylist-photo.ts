export type StylistGenderValue = "FEMALE" | "MALE" | "UNSPECIFIED";

export function normalizeGender(value: unknown): StylistGenderValue {
  const g = String(value || "").toUpperCase();
  if (g === "FEMALE" || g === "MALE") return g;
  return "UNSPECIFIED";
}

/** Default avatar shown before a stylist uploads a selfie. */
export function defaultAvatarPath(gender: StylistGenderValue | string | null | undefined) {
  const g = normalizeGender(gender);
  if (g === "MALE") return "/avatars/stylist-male.svg";
  if (g === "FEMALE") return "/avatars/stylist-female.svg";
  return "/avatars/stylist-neutral.svg";
}

type PhotoSource = {
  id: string;
  gender?: StylistGenderValue | string | null;
  photoUpdatedAt?: Date | string | null;
  /** Prefer this over loading photo bytes in list endpoints. */
  hasPhoto?: boolean;
  photoData?: Uint8Array | Buffer | null;
};

export function stylistHasPhoto(stylist: PhotoSource) {
  if (typeof stylist.hasPhoto === "boolean") return stylist.hasPhoto;
  return Boolean(stylist.photoData && stylist.photoData.length > 0);
}

/** Public URL for booking / catalog; cache-bust when selfie changes. */
export function stylistPhotoUrl(stylist: PhotoSource) {
  if (stylistHasPhoto(stylist)) {
    const v =
      stylist.photoUpdatedAt instanceof Date
        ? stylist.photoUpdatedAt.getTime()
        : stylist.photoUpdatedAt
          ? new Date(stylist.photoUpdatedAt).getTime()
          : Date.now();
    return `/api/public/stylist-photo/${stylist.id}?v=${v}`;
  }
  return defaultAvatarPath(stylist.gender);
}

export const MAX_PHOTO_BYTES = 400_000;
