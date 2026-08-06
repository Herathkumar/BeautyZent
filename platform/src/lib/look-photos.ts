/** Client "look book" photos attached to a past visit. */

export const MAX_LOOK_PHOTO_BYTES = 900_000;
export const MAX_PHOTOS_PER_APPOINTMENT = 6;
export const MAX_LOOK_CAPTION_LENGTH = 120;

export type DecodedPhoto = { bytes: Uint8Array<ArrayBuffer>; mime: string };

/** Decode a `data:` URL or bare base64 string, enforcing size + type limits. */
export function decodeLookPhoto(
  imageBase64: unknown,
  mimeType: unknown
): { ok: true; photo: DecodedPhoto } | { ok: false; error: string } {
  if (typeof imageBase64 !== "string" || !imageBase64.trim()) {
    return { ok: false, error: "Photo required" };
  }
  const raw = imageBase64.replace(/^data:[^;]+;base64,/, "");
  let decoded: Buffer;
  try {
    decoded = Buffer.from(raw, "base64");
  } catch {
    return { ok: false, error: "Photo could not be read" };
  }
  if (!decoded.length) return { ok: false, error: "Photo could not be read" };
  if (decoded.length > MAX_LOOK_PHOTO_BYTES) {
    return { ok: false, error: "Photo is too large. Try a smaller image." };
  }

  const mime = String(mimeType || "image/jpeg").toLowerCase();
  if (!mime.startsWith("image/")) return { ok: false, error: "Image required" };

  const bytes = new Uint8Array(decoded.byteLength);
  bytes.set(decoded);
  return {
    ok: true,
    photo: { bytes, mime: mime === "image/png" ? "image/png" : "image/jpeg" },
  };
}

export function normalizeCaption(value: unknown): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, MAX_LOOK_CAPTION_LENGTH);
}

export function lookPhotoUrl(slug: string, photoId: string) {
  return `/api/public/${slug}/look-photos/${photoId}`;
}
