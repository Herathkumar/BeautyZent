/** Member selfie shown in the FHS Client app profile. */

export const DEFAULT_CLIENT_AVATAR = "/avatars/client-neutral.svg";
export const MAX_CLIENT_PHOTO_BYTES = 400_000;

type PhotoSource = {
  photoUpdatedAt?: Date | string | null;
  hasPhoto?: boolean;
  photoData?: Uint8Array | Buffer | null;
};

export function clientHasPhoto(client: PhotoSource) {
  if (typeof client.hasPhoto === "boolean") return client.hasPhoto;
  return Boolean(client.photoData && client.photoData.length > 0);
}

/** Session-gated URL; cache-busted so a new selfie shows immediately. */
export function clientPhotoUrl(slug: string, client: PhotoSource) {
  if (!clientHasPhoto(client)) return DEFAULT_CLIENT_AVATAR;
  const stamp =
    client.photoUpdatedAt instanceof Date
      ? client.photoUpdatedAt.getTime()
      : client.photoUpdatedAt
        ? new Date(client.photoUpdatedAt).getTime()
        : Date.now();
  return `/api/public/${slug}/profile/photo/file?v=${stamp}`;
}
