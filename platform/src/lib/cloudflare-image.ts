/**
 * Shared text-to-image generation through Cloudflare Workers AI.
 * Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.
 */

export type CloudflareImageResult =
  | { ok: true; mime: "image/jpeg"; bytes: Uint8Array<ArrayBuffer>; model: string }
  | { ok: false; error: string; status?: number };

function credentials() {
  return {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || "",
    token: process.env.CLOUDFLARE_API_TOKEN?.trim() || "",
  };
}

function modelId() {
  return (
    process.env.CLOUDFLARE_IMAGE_MODEL?.trim() ||
    "@cf/black-forest-labs/flux-1-schnell"
  );
}

export function cloudflareImageConfigured() {
  const { accountId, token } = credentials();
  return Boolean(accountId && token);
}

function modelPath(model: string) {
  return model.split("/").map(encodeURIComponent).join("/");
}

export async function generateCloudflareImage(
  prompt: string
): Promise<CloudflareImageResult> {
  const { accountId, token } = credentials();
  if (!accountId || !token) {
    return {
      ok: false,
      status: 503,
      error:
        "Image AI is not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.",
    };
  }

  const model = modelId();
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
    accountId
  )}/ai/run/${modelPath(model)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt.slice(0, 2048),
        steps: 4,
      }),
    });
  } catch {
    return { ok: false, status: 502, error: "Cloudflare Image AI could not be reached." };
  }

  const json = (await res.json().catch(() => null)) as {
    image?: string;
    result?: { image?: string };
    errors?: Array<{ message?: string }>;
  } | null;

  if (!res.ok || !json) {
    const message =
      json?.errors?.find((item) => item.message)?.message ||
      `Cloudflare Image AI failed (${res.status})`;
    return {
      ok: false,
      status: res.status >= 500 ? 502 : res.status || 400,
      error: message.slice(0, 240),
    };
  }

  const encoded = json.result?.image || json.image;
  if (!encoded) {
    return {
      ok: false,
      status: 502,
      error: "Cloudflare Image AI did not return an image. Try a clearer prompt.",
    };
  }

  try {
    const decoded = Buffer.from(encoded, "base64");
    if (!decoded.length) throw new Error("empty image");
    const bytes: Uint8Array<ArrayBuffer> = new Uint8Array(decoded.byteLength);
    bytes.set(decoded);
    return { ok: true, mime: "image/jpeg", bytes, model };
  } catch {
    return {
      ok: false,
      status: 502,
      error: "Cloudflare returned an image that could not be read.",
    };
  }
}
