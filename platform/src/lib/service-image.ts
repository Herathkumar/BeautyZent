/**
 * Service menu images for store display / booking catalog.
 * AI generation uses the same Gemini image models as Style AI.
 */

export type ServiceImageAiResult =
  | { ok: true; mime: string; bytes: Uint8Array; model: string }
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
    process.env.SERVICE_IMAGE_AI_MODEL?.trim() ||
    process.env.STYLE_AI_MODEL?.trim() ||
    "gemini-2.5-flash-image"
  );
}

export function serviceImageAiConfigured() {
  return Boolean(apiKey());
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
  const key = apiKey();
  if (!key) {
    return {
      ok: false,
      status: 503,
      error: "Image AI is not configured. Set GEMINI_API_KEY to generate service images.",
    };
  }

  const model = modelId();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(key)}`;

  const instruction =
    opts.customPrompt?.trim() ||
    buildServiceImagePrompt({
      name: opts.name,
      category: opts.category,
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
      const bytes = new Uint8Array(decoded.byteLength);
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
    error: "Image AI did not return an image. Try again with a clearer service name.",
  };
}
