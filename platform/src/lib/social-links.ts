/** Normalize Instagram / Facebook handles for storage and public links. */

const MAX_SOCIAL_LENGTH = 80;

export function cleanSocialHandle(value: unknown): string | null {
  let text = String(value ?? "").trim();
  if (!text) return null;
  text = text.slice(0, MAX_SOCIAL_LENGTH);

  // Allow full URLs as entered.
  if (/^https?:\/\//i.test(text)) return text;

  // Strip leading @ for bare handles.
  text = text.replace(/^@+/, "").trim();
  return text || null;
}

export function instagramUrl(value: string | null | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@+/, "").replace(/^instagram\.com\//i, "");
  if (!handle) return null;
  return `https://instagram.com/${encodeURIComponent(handle)}`;
}

export function facebookUrl(value: string | null | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v
    .replace(/^@+/, "")
    .replace(/^(www\.)?facebook\.com\//i, "")
    .replace(/^fb\.com\//i, "");
  if (!handle) return null;
  return `https://facebook.com/${encodeURIComponent(handle)}`;
}
