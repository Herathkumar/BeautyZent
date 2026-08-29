/**
 * Service menu images for store display / booking catalog.
 * AI generation uses Cloudflare Workers AI.
 */

import {
  cloudflareImageConfigured,
  generateCloudflareImage,
} from "@/lib/cloudflare-image";

export type ServiceImageAiResult =
  | { ok: true; mime: string; bytes: Uint8Array<ArrayBuffer>; model: string }
  | { ok: false; error: string; status?: number };

export function serviceImageAiConfigured() {
  return cloudflareImageConfigured();
}

export const MAX_SERVICE_IMAGE_BYTES = 2_500_000;

export function serviceImageUrl(service: {
  id: string;
  hasImage?: boolean;
  imageUpdatedAt?: Date | string | null;
}) {
  if (!service.hasImage) return null;
  const v =
    service.imageUpdatedAt instanceof Date
      ? service.imageUpdatedAt.getTime()
      : service.imageUpdatedAt
        ? new Date(service.imageUpdatedAt).getTime()
        : Date.now();
  return `/api/public/service-image/${service.id}?v=${v}`;
}

export function buildServiceImagePrompt(opts: {
  name: string;
  category?: string | null;
  description?: string | null;
}) {
  const category = String(opts.category || "OTHER").toUpperCase();
  const audience =
    category === "MEN"
      ? "men's grooming / barber-salon"
      : category === "WOMEN"
        ? "women's hair salon"
        : "hair salon";
  const detail = opts.description?.trim()
    ? ` Service notes: ${opts.description.trim().slice(0, 180)}.`
    : "";
  return [
    `Create one photorealistic ${audience} photo that represents the service "${opts.name}".`,
    "Warm champagne and charcoal salon lighting, elegant and inviting.",
    "Show the finished look or the service moment clearly.",
    "No text, no logos, no watermarks, no UI chrome.",
    "Square-friendly composition suitable for a tablet price menu.",
    detail,
  ]
    .filter(Boolean)
    .join(" ");
}

export async function generateServiceImage(opts: {
  name: string;
  category?: string | null;
  description?: string | null;
  customPrompt?: string | null;
}): Promise<ServiceImageAiResult> {
  const instruction =
    opts.customPrompt?.trim() ||
    buildServiceImagePrompt({
      name: opts.name,
      category: opts.category,
      description: opts.description,
    });

  return generateCloudflareImage(instruction);
}
