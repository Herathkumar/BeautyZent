"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void | Promise<void>;
  /** Accent for capture button — stylist teal, manager gold, or client rose */
  accent?: "stylist" | "manager" | "book";
  fileInputTestId?: string;
  /** Stable id for label[htmlFor] from the profile page (no colon characters). */
  fileInputId?: string;
};

/** Circle guide as fractions of the preview stage (must match CSS overlay). */
const CIRCLE = {
  cx: 0.5,
  cy: 0.42,
  /** Diameter as a fraction of stage width */
  diameter: 0.82,
};

export function SelfieCamera({
  open,
  onClose,
  onCapture,
  accent = "stylist",
  fileInputTestId,
  fileInputId,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // React useId() includes ":" which breaks label/htmlFor on iPhone Safari
  const reactId = useId().replace(/:/g, "");
  const inputId = fileInputId || `selfie-gallery-${reactId}`;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError("");

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError("Camera not available on this device. Use Choose from photos.");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "user" },
            width: { ideal: 720 },
            height: { ideal: 960 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch {
        if (!cancelled) {
          setError("Could not open camera. Check permission, or choose a photo.");
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [open]);

  // Prevent background scroll while the camera sheet is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function handlePickedFile(file: File) {
    setBusy(true);
    setError("");
    try {
      await Promise.resolve(onCapture(file));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save photo");
    } finally {
      setBusy(false);
    }
  }

  async function capture() {
    const video = videoRef.current;
    const stage = stageRef.current;
    if (!video || !video.videoWidth || !stage) {
      setError("Camera not ready yet.");
      return;
    }
    setBusy(true);
    try {
      const videoW = video.videoWidth;
      const videoH = video.videoHeight;
      const scaleOut = 2;
      const viewW = Math.max(2, Math.round(stage.clientWidth * scaleOut));
      const viewH = Math.max(2, Math.round(stage.clientHeight * scaleOut));

      const covered = document.createElement("canvas");
      covered.width = viewW;
      covered.height = viewH;
      const cctx = covered.getContext("2d");
      if (!cctx) throw new Error("Could not capture");
      const cover = Math.max(viewW / videoW, viewH / videoH);
      const dw = videoW * cover;
      const dh = videoH * cover;
      const ox = (viewW - dw) / 2;
      const oy = (viewH - dh) / 2;
      cctx.drawImage(video, ox, oy, dw, dh);

      const mirrored = document.createElement("canvas");
      mirrored.width = viewW;
      mirrored.height = viewH;
      const mctx = mirrored.getContext("2d");
      if (!mctx) throw new Error("Could not capture");
      mctx.translate(viewW, 0);
      mctx.scale(-1, 1);
      mctx.drawImage(covered, 0, 0);

      const side = viewW * CIRCLE.diameter;
      const cx = viewW * CIRCLE.cx;
      const cy = viewH * CIRCLE.cy;
      const sx = Math.round(cx - side / 2);
      const sy = Math.round(cy - side / 2);
      const sw = Math.round(side);
      const sh = Math.round(side);

      const out = 512;
      const canvas = document.createElement("canvas");
      canvas.width = out;
      canvas.height = out;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not capture");
      ctx.fillStyle = "#1c1714";
      ctx.fillRect(0, 0, out, out);
      ctx.save();
      ctx.beginPath();
      ctx.arc(out / 2, out / 2, out / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(mirrored, sx, sy, sw, sh, 0, 0, out, out);
      ctx.restore();

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92)
      );
      if (!blob) throw new Error("Could not capture");
      const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
      await Promise.resolve(onCapture(file));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not capture");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <input
        ref={fileRef}
        id={inputId}
        type="file"
        accept="image/*"
        data-testid={fileInputTestId}
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handlePickedFile(file);
          e.target.value = "";
        }}
      />
    );
  }

  const captureBtn =
    accent === "manager"
      ? "bg-[#c9a87c] text-[#1c1714]"
      : accent === "book"
        ? "bg-[#c9b4e8] text-[#17121f]"
        : "bg-[#7ec4b8] text-[#0e1618]";
  const ring =
    accent === "manager"
      ? "border-[#f0c987]"
      : accent === "book"
        ? "border-[#e0d0f5]"
        : "border-[#b5ebe0]";
  const galleryBorder =
    accent === "manager"
      ? "border-[#f0c987]/70"
      : accent === "book"
        ? "border-[#e0d0f5]/70"
        : "border-[#b5ebe0]/70";

  const diameterPct = `${CIRCLE.diameter * 100}%`;
  const topPct = `${CIRCLE.cy * 100}%`;

  const dialog = (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black"
      role="dialog"
      aria-label="Take selfie"
      data-testid="selfie-camera"
    >
      <div className="flex shrink-0 items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="text-sm font-semibold tracking-wide text-white/90">
          Fit your face in the circle
        </p>
        <button
          type="button"
          className="rounded-full px-3 py-1.5 text-sm font-semibold text-white/85"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div
        ref={stageRef}
        className="relative mx-auto min-h-0 w-full max-w-lg flex-1 overflow-hidden bg-black"
      >
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="h-full w-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
        <div
          className={`pointer-events-none absolute left-1/2 aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] ${ring}`}
          style={{
            width: diameterPct,
            top: topPct,
            maxWidth: "none",
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.72)",
          }}
          aria-hidden
        />
        <p className="pointer-events-none absolute bottom-6 left-0 right-0 z-[1] text-center text-xs font-medium text-white/75">
          Center your face · what&apos;s in the circle is saved
        </p>
      </div>

      <div className="shrink-0 space-y-3 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
        {error ? <p className="text-center text-sm text-[#f5a8a8]">{error}</p> : null}

        {/* Above Capture so it stays visible; full-screen portal covers bottom nav */}
        <div
          className={`relative w-full overflow-hidden rounded-full border-2 ${galleryBorder} ${
            busy ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <span className="block py-3.5 text-center text-base font-semibold text-white">
            Choose from photos
          </span>
          <input
            ref={fileRef}
            id={inputId}
            type="file"
            accept="image/*"
            data-testid={fileInputTestId}
            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handlePickedFile(file);
              e.target.value = "";
            }}
          />
        </div>

        <button
          type="button"
          disabled={busy}
          className={`w-full rounded-full py-3.5 text-base font-bold disabled:opacity-50 ${captureBtn}`}
          onClick={() => void capture()}
        >
          {busy ? "Saving…" : "Capture"}
        </button>
      </div>
    </div>
  );

  // Must portal out of the overflow:hidden app shell or iPhone clips this under the nav
  if (!mounted) return null;
  return createPortal(dialog, document.body);
}
