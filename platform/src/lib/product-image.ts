/**
 * Retail product images for store display.
 * AI generation uses Cloudflare Workers AI.
 */

import {
  cloudflareImageConfigured,
  generateCloudflareImage,
} from "@/lib/cloudflare-image";

export type ProductImageAiResult =
  | { ok: true; mime: string; bytes: Uint8Array<ArrayBuffer>; model: string }
  | { ok: false; error: string; status?: number };

export function productImageAiConfigured() {
  return cloudflareImageConfigured();
}

export const MAX_PRODUCT_IMAGE_BYTES = 2_500_000;

export function productImageUrl(product: {
  id: string;
  hasImage?: boolean;
  imageUpdatedAt?: Date | string | null;
}) {
  if (!product.hasImage) return null;
  const v =
    product.imageUpdatedAt instanceof Date
      ? product.imageUpdatedAt.getTime()
      : product.imageUpdatedAt
        ? new Date(product.imageUpdatedAt).getTime()
        : Date.now();
  return `/api/public/product-image/${product.id}?v=${v}`;
}

export function buildProductImagePrompt(opts: {
  name: string;
  description?: string | null;
}) {
  const detail = opts.description?.trim()
    ? ` Product notes: ${opts.description.trim().slice(0, 180)}.`
    : "";
  return [
    `Create one photorealistic salon retail product photo of "${opts.name}".`,
    "Warm champagne and charcoal salon lighting, elegant shelf / beauty retail look.",
    "Show a single product bottle or package clearly, soft background, inviting.",
    "No text overlays, no logos, no watermarks, no UI chrome.",
    "Square-friendly composition suitable for a tablet retail menu.",
    detail,
  ]
    .filter(Boolean)
    .join(" ");
}

export async function generateProductImage(opts: {
  name: string;
  description?: string | null;
  customPrompt?: string | null;
}): Promise<ProductImageAiResult> {
  const instruction =
    opts.customPrompt?.trim() ||
    buildProductImagePrompt({
      name: opts.name,
      description: opts.description,
    });

  return generateCloudflareImage(instruction);
}

export function decodeProductImageBase64(
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
  if (decoded.length > MAX_PRODUCT_IMAGE_BYTES) {
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
