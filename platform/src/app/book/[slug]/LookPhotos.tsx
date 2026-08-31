"use client";

import { useEffect, useRef, useState } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import {
  MAX_LOOK_PHOTO_BYTES,
  MAX_PHOTOS_PER_APPOINTMENT,
} from "@/lib/look-photos";
import { fileToBoundedJpegDataUrl } from "@/lib/photo-resize";

export type LookPhoto = {
  id: string;
  url: string;
  caption: string | null;
  createdAt: string;
};

export type LookVisit = {
  id: string;
  startsAt: string;
  serviceName: string;
  stylistName: string;
  photos: LookPhoto[];
};

/**
 * Thumbnails + camera/gallery button for one past visit. Uploads are resized in
 * the browser so a 5 MB phone shot fits the JSON body limit.
 */
export function LookPhotoStrip({
  slug,
  appointmentId,
  photos,
  canAdd,
  onPhotosChange,
  onOpen,
  compact,
}: {
  slug: string;
  appointmentId: string;
  photos: LookPhoto[];
  canAdd: boolean;
  onPhotosChange: (photos: LookPhoto[]) => void;
  onOpen: (photo: LookPhoto) => void;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const full = photos.length >= MAX_PHOTOS_PER_APPOINTMENT;

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    setBusy(true);
    const next = [...photos];
    try {
      for (const file of Array.from(files)) {
        if (next.length >= MAX_PHOTOS_PER_APPOINTMENT) {
          setError(`Up to ${MAX_PHOTOS_PER_APPOINTMENT} photos per visit.`);
          break;
        }
        const dataUrl = await fileToBoundedJpegDataUrl(file, MAX_LOOK_PHOTO_BYTES);
        const res = await fetch(
          `/api/public/${slug}/my-bookings/${appointmentId}/photos`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageBase64: dataUrl, mimeType: "image/jpeg" }),
          }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        next.push(data.photo);
        onPhotosChange([...next]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const size = compact ? "h-16 w-16" : "h-20 w-20";

  return (
    <div className={compact ? "mt-2" : "mt-3"}>
      <div className="flex flex-wrap items-center gap-2">
        {photos.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onOpen(p)}
            aria-label="View photo"
            data-testid="look-photo-thumb"
            className={`${size} overflow-hidden rounded-xl border border-[color:var(--line)] bg-black/10`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt={p.caption || "Visit photo"}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </button>
        ))}

        {canAdd && !full ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            data-testid="look-photo-add"
            aria-label={busy ? "Saving photo" : "Add photo"}
            title={busy ? "Saving…" : "Add photo — Highlight this look"}
            className={`book-luxe-empty book-luxe-empty--tile ${size} disabled:opacity-60`}
          >
            <span className="book-luxe-empty__plus" aria-hidden>
              {busy ? "…" : "+"}
            </span>
            <span className="text-[10px] font-semibold leading-tight">
              {busy ? "Saving" : "Add photo"}
            </span>
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        data-testid="look-photo-input"
        onChange={(e) => upload(e.target.files)}
      />

      {error ? <p className="mt-2 text-xs text-[#f5a8a8]">{error}</p> : null}
    </div>
  );
}

/** Full-screen look-book viewer — swipe / arrows between photos in one visit. */
export function LookPhotoViewer({
  slug,
  photos,
  photoId,
  appointmentId,
  visitLabel,
  onClose,
  onPhotoIdChange,
  onDeleted,
  onCaptionSaved,
}: {
  slug: string;
  photos: LookPhoto[];
  photoId: string | null;
  appointmentId: string | null;
  visitLabel: string;
  onClose: () => void;
  onPhotoIdChange: (photoId: string) => void;
  onDeleted: (photoId: string) => void;
  onCaptionSaved: (photoId: string, caption: string) => void;
}) {
  const confirm = useConfirm();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const index = Math.max(
    0,
    photos.findIndex((p) => p.id === photoId)
  );
  const photo = photos[index] ?? null;

  useEffect(() => {
    setCaption(photo?.caption || "");
    setError("");
  }, [photo?.id, photo?.caption]);

  // Jump the carousel to the active photo when it changes externally.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || index < 0) return;
    const slide = el.children[index] as HTMLElement | undefined;
    if (slide) {
      el.scrollTo({ left: slide.offsetLeft, behavior: "auto" });
    }
  }, [photoId, photos.length, index]);

  if (!photo || !appointmentId || photos.length === 0) return null;

  function go(delta: number) {
    const next = index + delta;
    if (next < 0 || next >= photos.length) return;
    onPhotoIdChange(photos[next].id);
    const el = scrollerRef.current;
    const slide = el?.children[next] as HTMLElement | undefined;
    if (el && slide) {
      el.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
    }
  }

  function onScroll() {
    const el = scrollerRef.current;
    if (!el || !photos.length) return;
    const i = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1));
    const clamped = Math.max(0, Math.min(photos.length - 1, i));
    const id = photos[clamped]?.id;
    if (id && id !== photoId) onPhotoIdChange(id);
  }

  async function remove() {
    const ok = await confirm({
      title: "Delete this photo?",
      message: "It will be removed from your look book.",
      confirmLabel: "Delete",
      cancelLabel: "Keep",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/public/${slug}/my-bookings/${appointmentId}/photos/${photo.id}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      const remaining = photos.filter((p) => p.id !== photo.id);
      onDeleted(photo.id);
      if (remaining.length === 0) {
        onClose();
      } else {
        onPhotoIdChange(remaining[Math.min(index, remaining.length - 1)].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="look-photo-viewer fixed inset-0 z-[70] flex flex-col bg-[#120e1a]/92 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-label="Visit photo"
      data-testid="look-photo-viewer"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#f3eafc]">
            {visitLabel}
          </p>
          {photos.length > 1 ? (
            <p className="text-xs text-[#c9b4e8]">
              {index + 1} / {photos.length} · swipe to browse
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close photo"
          data-testid="look-photo-close"
          className="look-photo-viewer__close inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#c9b4e8] px-4 py-2.5 text-sm font-bold text-[#17121f] shadow-[0_8px_24px_rgba(201,180,232,0.45)]"
        >
          <svg viewBox="0 0 20 20" fill="none" aria-hidden className="h-4 w-4">
            <path
              d="M5 5l10 10M15 5L5 15"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
          Close
        </button>
      </div>

      <div className="relative mt-3 min-h-0 flex-1">
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className="flex h-full snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          data-testid="look-photo-carousel"
        >
          {photos.map((p) => (
            <div
              key={p.id}
              className="flex h-full w-full shrink-0 snap-center items-center justify-center px-1"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={p.caption || "Visit photo"}
                className="max-h-full max-w-full rounded-2xl object-contain"
                draggable={false}
              />
            </div>
          ))}
        </div>

        {photos.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              disabled={index === 0}
              onClick={() => go(-1)}
              className="absolute top-1/2 left-1 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#c9b4e8] text-lg font-bold text-[#17121f] shadow-lg disabled:opacity-30"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next photo"
              disabled={index >= photos.length - 1}
              onClick={() => go(1)}
              className="absolute top-1/2 right-1 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#c9b4e8] text-lg font-bold text-[#17121f] shadow-lg disabled:opacity-30"
            >
              ›
            </button>
          </>
        ) : null}
      </div>

      {photos.length > 1 ? (
        <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPhotoIdChange(p.id)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-[#c9b4e8]" : "w-1.5 bg-white/30"
              }`}
            />
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Add a note — e.g. #4 fade on the sides"
          maxLength={120}
          className="min-w-0 flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/45"
        />
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const res = await fetch(
                `/api/public/${slug}/my-bookings/${appointmentId}/photos/${photo.id}`,
                {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ caption }),
                }
              );
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "Save failed");
              onCaptionSaved(photo.id, data.photo.caption || "");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Save failed");
            } finally {
              setBusy(false);
            }
          }}
          className="btn-solid rounded-full px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          Save note
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={remove}
          className="rounded-full border border-[rgba(245,168,168,0.5)] px-4 py-2.5 text-sm font-semibold text-[#f5a8a8] disabled:opacity-60"
        >
          Delete
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-[#f5a8a8]">{error}</p> : null}
    </div>
  );
}
