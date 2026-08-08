/** Preferred look attached to a booking (upload, look-book copy, or AI). */

import { decodeLookPhoto, type DecodedPhoto } from "@/lib/look-photos";

export const MAX_STYLE_AI_PER_DAY = 5;
export const MAX_STYLE_PROMPT_LENGTH = 200;

export const STYLE_PRESETS = [
  {
    id: "soft-layers",
    label: "Soft layers",
    prompt:
      "Restyle the hair into soft face-framing layers with natural movement. Keep the same face, skin tone, and identity.",
  },
  {
    id: "curtain-bangs",
    label: "Curtain bangs",
    prompt:
      "Add elegant curtain bangs that part in the middle and frame the face. Keep the same face and identity.",
  },
  {
    id: "classic-fade",
    label: "Classic fade",
    prompt:
      "Give a clean classic fade haircut with neat taper on the sides. Keep the same face and identity.",
  },
  {
    id: "balayage",
    label: "Balayage",
    prompt:
      "Apply soft balayage highlights with a natural grow-out look. Keep the same face, skin tone, and identity.",
  },
  {
    id: "sleek-bob",
    label: "Sleek bob",
    prompt:
      "Restyle into a sleek chin-length bob with a polished finish. Keep the same face and identity.",
  },
  {
    id: "beard-tidy",
    label: "Beard tidy",
    prompt:
      "Tidy and shape the beard with clean lines while keeping a natural look. Keep the same face and identity.",
  },
] as const;

export function decodeStylePhoto(
  imageBase64: unknown,
  mimeType: unknown
): { ok: true; photo: DecodedPhoto } | { ok: false; error: string } {
  return decodeLookPhoto(imageBase64, mimeType);
}

export function normalizeStylePrompt(value: unknown): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, MAX_STYLE_PROMPT_LENGTH);
}

export function stylePrefPublicUrl(slug: string, prefId: string) {
  return `/api/public/${slug}/style-prefs/${prefId}`;
}

export function stylePrefStylistUrl(appointmentId: string) {
  return `/api/stylist/style-prefs/${appointmentId}`;
}
