/**
 * Retail product images for store display.
 * AI generation uses the same Gemini image models as service/style AI.
 */

export type ProductImageAiResult =
  | { ok: true; mime: string; bytes: Uint8Array<ArrayBuffer>; model: string }
  | { ok: false; error: string; status?: number };

function apiKey() {
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    ""
  );
}

function modelId() {
  return (
    process.env.PRODUCT_IMAGE_AI_MODEL?.trim() ||
    process.env.SERVICE_IMAGE_AI_MODEL?.trim() ||
    process.env.STYLE_AI_MODEL?.trim() ||
    "gemini-2.5-flash-image"
  );
}

export function productImageAiConfigured() {
  return Boolean(apiKey());
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
  const key = apiKey();
  if (!key) {
    return {
      ok: false,
      status: 503,
      error: "Image AI is not configured. Set GEMINI_API_KEY to generate product images.",
    };
  }

  const model = modelId();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(key)}`;

  const instruction =
    opts.customPrompt?.trim() ||
    buildProductImagePrompt({
      name: opts.name,
      description: opts.description,
    });

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: instruction }],
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 502, error: "Image AI could not be reached. Try again." };
  }

  const json = (await res.json().catch(() => null)) as {
    error?: { message?: string };
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
          inlineData?: { mimeType?: string; data?: string };
          inline_data?: { mime_type?: string; data?: string };
        }>;
      };
    }>;
  } | null;

  if (!res.ok) {
    const msg = json?.error?.message || `Image AI failed (${res.status})`;
    return {
      ok: false,
      status: res.status >= 500 ? 502 : 400,
      error: msg.slice(0, 240),
    };
  }

  const parts = json?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    const inline = part.inlineData || part.inline_data;
    if (!inline?.data) continue;
    const mime =
      ("mimeType" in inline && inline.mimeType) ||
      ("mime_type" in inline && inline.mime_type) ||
      "image/png";
    try {
      const decoded = Buffer.from(inline.data, "base64");
      if (!decoded.length) continue;
      const bytes: Uint8Array<ArrayBuffer> = new Uint8Array(decoded.byteLength);
      bytes.set(decoded);
      return {
        ok: true,
        mime: String(mime).includes("png") ? "image/png" : "image/jpeg",
        bytes,
        model,
      };
    } catch {
      continue;
    }
  }

  return {
    ok: false,
    status: 502,
    error: "Image AI did not return an image. Try again with a clearer product name.",
  };
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
