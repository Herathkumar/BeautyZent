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
            className={`${size} flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[rgba(232,180,162,0.5)] text-champagne disabled:opacity-60`}
          >
            <span aria-hidden className="text-lg leading-none">
              {busy ? "…" : "+"}
            </span>
            <span className="text-[10px] font-semibold tracking-wide uppercase">
              {busy ? "Saving" : "Photo"}
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

/** Full-screen photo viewer with caption editing and delete. */
export function LookPhotoViewer({
  slug,
  photo,
  appointmentId,
  visitLabel,
  onClose,
  onDeleted,
  onCaptionSaved,
}: {
  slug: string;
  photo: LookPhoto | null;
  appointmentId: string | null;
  visitLabel: string;
  onClose: () => void;
  onDeleted: (photoId: string) => void;
  onCaptionSaved: (photoId: string, caption: string) => void;
}) {
  const confirm = useConfirm();
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setCaption(photo?.caption || "");
    setError("");
  }, [photo]);

  if (!photo || !appointmentId) return null;

  async function remove() {
    if (!photo || !appointmentId) return;
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
      onDeleted(photo.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-black/85 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-label="Visit photo"
      data-testid="look-photo-viewer"
    >
      <div className="flex items-center justify-between gap-3 text-white">
        <p className="min-w-0 truncate text-sm font-semibold">{visitLabel}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/25 px-3 py-1.5 text-sm"
        >
          Close
        </button>
      </div>

      <div className="mt-3 flex min-h-0 flex-1 items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={photo.caption || "Visit photo"}
          className="max-h-full max-w-full rounded-2xl object-contain"
        />
      </div>

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
