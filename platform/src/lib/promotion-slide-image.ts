export const MAX_PROMOTION_SLIDE_IMAGE_BYTES = 2_500_000;

export function promotionSlideImageUrl(slide: {
  id: string;
  hasImage?: boolean;
  imageUpdatedAt?: Date | string | null;
}) {
  if (!slide.hasImage) return null;
  const v =
    slide.imageUpdatedAt instanceof Date
      ? slide.imageUpdatedAt.getTime()
      : slide.imageUpdatedAt
        ? new Date(slide.imageUpdatedAt).getTime()
        : Date.now();
  return `/api/public/promotion-slide-image/${slide.id}?v=${v}`;
}

export function decodePromotionSlideImageBase64(
  imageBase64: unknown,
  mimeType: unknown
):
  | { ok: true; bytes: Uint8Array<ArrayBuffer>; mime: string }
  | { ok: false; error: string } {
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
  if (decoded.length > MAX_PROMOTION_SLIDE_IMAGE_BYTES) {
    return { ok: false, error: "Photo is too large. Try a smaller image." };
  }
  const mime = String(mimeType || "image/jpeg").toLowerCase();
  if (!mime.startsWith("image/")) return { ok: false, error: "Image required" };
  const bytes: Uint8Array<ArrayBuffer> = new Uint8Array(decoded.byteLength);
  bytes.set(decoded);
  return {
    ok: true,
    bytes,
    mime: mime.includes("png") ? "image/png" : "image/jpeg",
  };
}

export type PromotionBoardSlide = {
  id: string;
  title: string | null;
  imageUrl: string;
  durationSec: number;
};

export type PromotionBoardPayload = {
  enabled: boolean;
  intervalSec: number;
  defaultSlideSec: number;
  slides: PromotionBoardSlide[];
};
