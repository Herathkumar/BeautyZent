import type { StylePrefDraft } from "./StylePreviewPanel";

function key(slug: string) {
  return `fhsalon-style-draft:${slug}`;
}

/** Persist a Look book studio draft so Book can offer “attach this look”. */
export function writeStyleDraft(slug: string, draft: StylePrefDraft | null) {
  try {
    if (!draft) {
      window.sessionStorage.removeItem(key(slug));
      return;
    }
    window.sessionStorage.setItem(key(slug), JSON.stringify(draft));
  } catch {
    /* private mode */
  }
}

export function readStyleDraft(slug: string): StylePrefDraft | null {
  try {
    const raw = window.sessionStorage.getItem(key(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StylePrefDraft;
    if (!parsed?.imageBase64 || !parsed?.mimeType || !parsed?.source) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearStyleDraft(slug: string) {
  writeStyleDraft(slug, null);
}
