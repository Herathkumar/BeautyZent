/**
 * AI style preview via Google Gemini image models.
 * Set GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY). Optional STYLE_AI_MODEL.
 */

export type StyleAiResult =
  | { ok: true; mime: string; bytes: Buffer; model: string }
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
    process.env.STYLE_AI_MODEL?.trim() ||
    "gemini-2.5-flash-image"
  );
}

export function styleAiConfigured() {
  return Boolean(apiKey());
}

export async function generateStylePreview(opts: {
  imageBytes: Uint8Array;
  mime: string;
  prompt: string;
}): Promise<StyleAiResult> {
  const key = apiKey();
  if (!key) {
    return {
      ok: false,
      status: 503,
      error: "Style AI is not configured yet. You can still upload a photo or pick from your look book.",
    };
  }

  const model = modelId();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(key)}`;

  const instruction = [
    "You are a salon style preview tool.",
    "Edit ONLY the hairstyle / grooming in the photo based on the request.",
    "Keep the same person, face, skin tone, expression, clothing, and background as much as possible.",
    "Return one realistic edited photo. Do not add text overlays or watermarks.",
    `Style request: ${opts.prompt}`,
  ].join(" ");

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: instruction },
          {
            inlineData: {
              mimeType: opts.mime,
              data: Buffer.from(opts.imageBytes).toString("base64"),
            },
          },
        ],
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
    return { ok: false, status: 502, error: "Style AI could not be reached. Try again." };
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
    const msg = json?.error?.message || `Style AI failed (${res.status})`;
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
      const bytes = Buffer.from(inline.data, "base64");
      if (!bytes.length) continue;
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
    error: "Style AI did not return an image. Try another photo or preset.",
  };
}
