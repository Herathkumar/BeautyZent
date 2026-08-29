"use client";

import { useEffect, useRef, useState } from "react";
import { SelfieCamera } from "@/components/SelfieCamera";
import { fileToJpegDataUrl } from "@/lib/photo-resize";

export type StylePrefDraft = {
  imageBase64: string;
  mimeType: string;
  source: "UPLOAD" | "LOOKBOOK" | "AI";
  prompt?: string | null;
};

type LookThumb = {
  id: string;
  url: string;
  caption: string | null;
};

type Preset = { id: string; label: string };

type Props = {
  slug: string;
  isMember: boolean;
  value: StylePrefDraft | null;
  onChange: (next: StylePrefDraft | null) => void;
  /** studio = Look book playground; attach = booking / visit (default). */
  variant?: "studio" | "attach";
};

export function StylePreviewPanel({
  slug,
  isMember,
  value,
  onChange,
  variant = "attach",
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [basePhoto, setBasePhoto] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [lookPhotos, setLookPhotos] = useState<LookThumb[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [presetId, setPresetId] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/public/${slug}/style-preview/generate`)
      .then((r) => r.json())
      .then((d) => {
        setAiConfigured(Boolean(d.configured));
        const list: Preset[] = d.presets || [];
        setPresets(list);
        if (list[0] && !presetId) setPresetId(list[0].id);
      })
      .catch(() => setAiConfigured(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per slug
  }, [slug]);

  // If parent passes an existing saved photo URL, mirror it as the working base.
  useEffect(() => {
    if (!value?.imageBase64) return;
    if (value.imageBase64.startsWith("data:")) {
      setBasePhoto(value.imageBase64);
      return;
    }
    if (!value.imageBase64.startsWith("/")) return;
    let cancelled = false;
    fetch(value.imageBase64)
      .then((r) => r.blob())
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(new Error("read failed"));
            reader.readAsDataURL(blob);
          })
      )
      .then((dataUrl) => {
        if (cancelled || !dataUrl) return;
        setBasePhoto(dataUrl);
        onChange({
          ...value,
          imageBase64: dataUrl,
          mimeType: "image/jpeg",
        });
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once when URL is provided
  }, [value?.imageBase64]);

  useEffect(() => {
    if (!isMember) {
      setLookPhotos([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/public/${slug}/my-bookings`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const photos: LookThumb[] = [];
        for (const a of d.appointments || []) {
          for (const p of a.photos || []) {
            photos.push({ id: p.id, url: p.url, caption: p.caption });
          }
        }
        setLookPhotos(photos.slice(0, 24));
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [slug, isMember]);

  async function setFromFile(file: File, source: StylePrefDraft["source"] = "UPLOAD") {
    setError("");
    try {
      const dataUrl = await fileToJpegDataUrl(file, 1024, 0.85);
      setBasePhoto(dataUrl);
      onChange({
        imageBase64: dataUrl,
        mimeType: "image/jpeg",
        source,
      });
    } catch {
      setError("Could not read that photo.");
    }
  }

  async function pickLookPhoto(url: string) {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Could not load look-book photo");
      const blob = await res.blob();
      const file = new File([blob], "look.jpg", { type: blob.type || "image/jpeg" });
      await setFromFile(file, "LOOKBOOK");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not use look-book photo");
    } finally {
      setBusy(false);
    }
  }

  async function runAi() {
    const source = basePhoto || value?.imageBase64;
    if (!source) {
      setError("Add a selfie or look-book photo first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/public/${slug}/style-preview/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: source,
          mimeType: "image/jpeg",
          presetId: customPrompt.trim() ? undefined : presetId,
          prompt: customPrompt.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Style AI failed");
      setRemaining(typeof data.remainingToday === "number" ? data.remainingToday : null);
      onChange({
        imageBase64: data.imageBase64,
        mimeType: data.mimeType || "image/png",
        source: "AI",
        prompt: data.prompt || customPrompt || presetId,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Style AI failed");
    } finally {
      setBusy(false);
    }
  }

  const preview = value?.imageBase64 || basePhoto;
  const isStudio = variant === "studio";

  return (
    <div className="book-card space-y-3 rounded-2xl p-4" data-testid={isStudio ? "style-preview-studio" : "style-preview-attach"}>
      <div>
        <h3 className="font-semibold text-ink">
          {isStudio ? "Style preview studio" : "Style preview"}
        </h3>
        <p className="mt-1 text-sm text-muted">
          {isStudio
            ? "Try looks with AI, upload inspo, or reuse a past visit photo. Attach one when you book or on an upcoming visit."
            : "Optional — show your stylist the look you want. Upload, pick a past look, or try free AI styles."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCameraOpen(true)}
          className="rounded-full border border-[color:var(--line)] bg-[color:var(--color-cream)] px-3 py-1.5 text-xs font-semibold text-champagne"
        >
          Camera / gallery
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-full border border-[color:var(--line)] bg-[color:var(--color-cream)] px-3 py-1.5 text-xs font-semibold text-champagne"
        >
          Upload photo
        </button>
        {value || basePhoto ? (
          <button
            type="button"
            onClick={() => {
              setBasePhoto(null);
              onChange(null);
              setError("");
            }}
            className="rounded-full border border-[rgba(181,74,60,0.4)] px-3 py-1.5 text-xs font-semibold text-[#b54a3c]"
          >
            Remove
          </button>
        ) : null}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void setFromFile(file, "UPLOAD");
        }}
      />

      {isMember && lookPhotos.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-wide text-champagne uppercase">
            From your look book
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {lookPhotos.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={busy}
                onClick={() => void pickLookPhoto(p.url)}
                className="shrink-0 overflow-hidden rounded-xl ring-2 ring-transparent hover:ring-[rgba(201,180,232,0.55)]"
                title={p.caption || "Look book photo"}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="h-16 w-16 object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Style preview"
          className="mx-auto max-h-64 w-full max-w-xs rounded-2xl object-cover ring-2 ring-[rgba(201,180,232,0.4)]"
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-[color:var(--line)] px-4 py-8 text-center text-sm text-muted">
          No photo yet — add one to try styles.
        </div>
      )}

      <div className="space-y-2 border-t border-[color:var(--line)] pt-3">
        <p className="text-xs font-semibold tracking-wide text-champagne uppercase">
          Try with AI {aiConfigured ? "(free)" : "(setup needed)"}
        </p>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPresetId(p.id);
                setCustomPrompt("");
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                presetId === p.id && !customPrompt.trim()
                  ? "btn-solid"
                  : "border border-[color:var(--line)] bg-[color:var(--color-cream)] text-champagne"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <input
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Or describe a look (e.g. soft curtain bangs)"
          maxLength={200}
          className="w-full rounded-xl border px-3 py-2.5 text-sm"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void runAi()}
          className="btn-solid w-full rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-70"
        >
          {busy ? "Working…" : "Generate style preview"}
        </button>
        {!preview ? (
          <p className="text-xs text-muted">Add a photo above, then generate a style.</p>
        ) : null}
        {remaining !== null ? (
          <p className="text-xs text-muted">{remaining} free AI tries left today</p>
        ) : null}
        {!aiConfigured ? (
          <p className="text-xs text-muted">
            AI needs a Gemini API key on the server. Upload and look book still work.
          </p>
        ) : null}
      </div>

      {error ? <p className="text-sm text-[#b54a3c]">{error}</p> : null}
      {value && !isStudio ? (
        <p className="text-xs font-medium text-champagne">
          Saved for this booking
          {value.source === "AI"
            ? " · AI preview"
            : value.source === "LOOKBOOK"
              ? " · from look book"
              : " · upload"}
          {value.prompt ? ` · ${value.prompt}` : ""}
        </p>
      ) : null}
      {value && isStudio ? (
        <p className="text-xs font-medium text-champagne">
          Ready to attach
          {value.source === "AI"
            ? " · AI preview"
            : value.source === "LOOKBOOK"
              ? " · from look book"
              : " · upload"}
          {value.prompt ? ` · ${value.prompt}` : ""}
          . Open Book or an upcoming visit to attach it.
        </p>
      ) : null}

      <SelfieCamera
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        accent="book"
        onCapture={async (file) => {
          setCameraOpen(false);
          await setFromFile(file, "UPLOAD");
        }}
      />
    </div>
  );
}
