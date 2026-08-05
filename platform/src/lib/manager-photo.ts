import { MAX_PHOTO_BYTES } from "@/lib/stylist-photo";

export { MAX_PHOTO_BYTES };

export const MANAGER_DEFAULT_AVATAR = "/avatars/manager-generic.svg";

type PhotoSource = {
  photoUpdatedAt?: Date | string | null;
  hasPhoto?: boolean;
  photoMime?: string | null;
};

export function managerHasPhoto(user: PhotoSource) {
  if (typeof user.hasPhoto === "boolean") return user.hasPhoto;
  return Boolean(user.photoUpdatedAt && user.photoMime);
}

/** Auth-gated selfie URL for the manager account page; cache-bust when updated. */
export function managerPhotoUrl(user: PhotoSource) {
  if (managerHasPhoto(user)) {
    const v =
      user.photoUpdatedAt instanceof Date
        ? user.photoUpdatedAt.getTime()
        : user.photoUpdatedAt
          ? new Date(user.photoUpdatedAt).getTime()
          : Date.now();
    return `/api/admin/photo/file?v=${v}`;
  }
  return MANAGER_DEFAULT_AVATAR;
}
