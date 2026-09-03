"use client";

import { useEffect, useRef, useState } from "react";
import { SelfieCamera } from "@/components/SelfieCamera";
import { fileToJpegDataUrl } from "@/lib/photo-resize";
import { LuxeSparkle } from "./luxe";

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
  /** studio = Look book playground; attach = booking / visit; summary = compact inside booking summary. */
  variant?: "studio" | "attach" | "summary";
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
  const [compareOpen, setCompareOpen] = useState(false);
  const [split, setSplit] = useState(52);
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
      setCompareOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Style AI failed");
    } finally {
      setBusy(false);
    }
  }

  const preview = value?.imageBase64 || basePhoto;
  const isStudio = variant === "studio";
  const isSummary = variant === "summary";

  const panelTitle = isStudio
    ? "Style preview studio"
    : "Style preview";
  const panelHint = isStudio
    ? "Try looks with AI, upload inspo, or reuse a past visit photo. Attach one when you book or on an upcoming visit."
    : isSummary
      ? "Optional — show your stylist the look you want"
      : "Optional — show your stylist the look you want. Upload, pick a past look, or try free AI styles.";
  const cameraLabel = isStudio ? "Camera / gallery" : "Camera";
  const uploadLabel = isStudio ? "Upload photo" : "Upload";
  const statusMessage = value
    ? isStudio
      ? `Ready to attach${
          value.source === "AI"
            ? " · AI preview"
            : value.source === "LOOKBOOK"
              ? " · from BeautyAI"
              : " · upload"
        }${value.prompt ? ` · ${value.prompt}` : ""}. Open Book or an upcoming visit to attach it.`
      : isSummary
        ? `Attached to this booking${
            value.source === "AI"
              ? " · AI preview"
              : value.source === "LOOKBOOK"
                ? " · from BeautyAI"
                : " · upload"
          }${value.prompt ? ` · ${value.prompt}` : ""}`
        : `Saved for this booking${
            value.source === "AI"
              ? " · AI preview"
              : value.source === "LOOKBOOK"
                ? " · from BeautyAI"
                : " · upload"
          }${value.prompt ? ` · ${value.prompt}` : ""}`
    : null;

  const compareDialog =
    compareOpen && preview ? (
      <div
        className="fixed inset-0 z-[96] flex flex-col bg-black/94"
        role="dialog"
        aria-modal="true"
        aria-label="Style before and after"
      >
        <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <p className="book-luxe-kicker">Style preview</p>
          <button
            type="button"
            onClick={() => setCompareOpen(false)}
            className="btn-solid rounded-full px-4 py-2 text-sm font-semibold"
          >
            Close
          </button>
        </div>
        <div className="relative mx-auto mt-4 min-h-0 w-full max-w-lg flex-1 px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="relative h-full overflow-hidden rounded-[1.4rem] border border-[color:var(--champagne)]/35">
            {basePhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={basePhoto} alt="Before" className="absolute inset-0 h-full w-full object-cover" />
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="After"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
            />
            <div
              className="absolute inset-y-0 w-0.5 bg-[#e8c99a] shadow-[0_0_16px_rgba(232,201,154,0.7)]"
              style={{ left: `${split}%` }}
              aria-hidden
            />
          </div>
          <label className="mt-4 block text-center text-xs text-champagne">
            Slide to compare
            <input
              type="range"
              min={8}
              max={92}
              value={split}
              onChange={(e) => setSplit(Number(e.target.value))}
              className="mt-2 w-full accent-[#e8c99a]"
            />
          </label>
        </div>
      </div>
    ) : null;

  const luxePanel = (
    <div
      className={`book-style-preview--luxe${isStudio ? " book-style-preview--studio" : ""}${
        isSummary ? " book-style-preview--compact-head" : ""
      }`}
      data-testid={
        isStudio ? "style-preview-studio" : isSummary ? "style-preview-summary" : "style-preview-attach"
      }
    >
      <div className="book-style-preview__head">
        <h3 className="book-style-preview__heading font-[family-name:var(--font-display)]">
          {panelTitle}
        </h3>
        <p className="book-style-preview__hint">{panelHint}</p>
      </div>

      <div className="book-style-preview__actions">
        <button
          type="button"
          onClick={() => setCameraOpen(true)}
          className="book-style-preview__chip"
        >
          {cameraLabel}
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="book-style-preview__chip"
        >
          {uploadLabel}
        </button>
        {value || basePhoto ? (
          <button
            type="button"
            onClick={() => {
              setBasePhoto(null);
              onChange(null);
              setError("");
            }}
            className="book-style-preview__chip is-danger"
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
        <div className="book-style-preview__lookbook-wrap">
          <p className="book-style-preview__lookbook-label">From BeautyAI</p>
          <div className="book-style-preview__lookbook">
            {lookPhotos.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={busy}
                onClick={() => void pickLookPhoto(p.url)}
                title={p.caption || "BeautyAI photo"}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {preview ? (
        <button
          type="button"
          onClick={() => setCompareOpen(true)}
          className="book-style-preview__preview"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Style preview" />
          {value?.source === "AI" ? (
            <span className="book-style-preview__preview-badge">Tap for before / after</span>
          ) : null}
        </button>
      ) : (
        <div className="book-luxe-empty book-luxe-empty--dark px-4 py-8 text-center">
          <span className="book-luxe-empty__plus" aria-hidden>
            +
          </span>
          <p className="mt-2 text-sm font-semibold">Add a portrait</p>
          <p className="text-xs">Soft light, then try an AI look</p>
        </div>
      )}

      <div className="book-style-preview__ai">
        <p className="book-style-preview__ai-label">
          <LuxeSparkle className="h-3 w-3" />
          AI style suggestions {aiConfigured ? "" : "(setup needed)"}
        </p>
        <div className="book-style-preview__presets">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPresetId(p.id);
                setCustomPrompt("");
              }}
              className={`book-style-preview__chip ${
                presetId === p.id && !customPrompt.trim() ? "is-active" : ""
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
          className="book-style-preview__prompt"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void runAi()}
          className="book-style-preview__generate"
        >
          {busy ? "Working…" : "Generate style preview"}
        </button>
        {!preview ? (
          <p className="book-style-preview__status">Add a photo above, then generate a style.</p>
        ) : null}
        {remaining !== null ? (
          <p className="book-style-preview__status">{remaining} free AI tries left today</p>
        ) : null}
        {!aiConfigured ? (
          <p className="book-style-preview__status">
            AI needs a Gemini API key on the server. Upload and BeautyAI still work.
          </p>
        ) : null}
      </div>

      {statusMessage ? <p className="book-style-preview__status">{statusMessage}</p> : null}
      {error ? <p className="text-sm text-[#e8a8a0]">{error}</p> : null}
    </div>
  );

  return (
    <>
      {isStudio ? <div className="book-luxe-card rounded-2xl p-4">{luxePanel}</div> : luxePanel}
      {compareDialog}
      <SelfieCamera
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        accent="book"
        onCapture={async (file) => {
          setCameraOpen(false);
          await setFromFile(file, "UPLOAD");
        }}
      />
    </>
  );
}
