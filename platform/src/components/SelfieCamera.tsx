"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void | Promise<void>;
  /** Accent for capture button — stylist teal or manager gold */
  accent?: "stylist" | "manager";
  fileInputTestId?: string;
};

export function SelfieCamera({
  open,
  onClose,
  onCapture,
  accent = "stylist",
  fileInputTestId,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError("");

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError("Camera not available on this device. Use Choose photo instead.");
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

  async function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setError("Camera not ready yet.");
      return;
    }
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not capture");
      // Mirror to match preview (selfie feel)
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9)
      );
      if (!blob) throw new Error("Could not capture");
      const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
      await onCapture(file);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not capture");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    // Keep file input mounted for Playwright uploads even when closed
    return (
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="user"
        className="sr-only"
        data-testid={fileInputTestId}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onCapture(file);
          e.target.value = "";
        }}
      />
    );
  }

  const captureBtn =
    accent === "manager"
      ? "bg-[#c9a87c] text-[#1c1714]"
      : "bg-[#7ec4b8] text-[#0e1618]";
  const ring =
    accent === "manager" ? "border-[#f0c987]" : "border-[#b5ebe0]";

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col bg-black"
      role="dialog"
      aria-label="Take selfie"
      data-testid="selfie-camera"
    >
      <div className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="text-sm font-semibold tracking-wide text-white/90">Fit your face in the oval</p>
        <button
          type="button"
          className="rounded-full px-3 py-1.5 text-sm font-semibold text-white/85"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div className="relative mx-auto w-full max-w-lg flex-1 overflow-hidden bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="h-full w-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
        {/* Dim outside oval */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 48% 58% at 50% 42%, transparent 0%, transparent 49%, rgba(0,0,0,0.72) 51%)",
          }}
        />
        {/* Oval guide line */}
        <div
          className={`pointer-events-none absolute left-1/2 top-[42%] aspect-[3/4] w-[56%] max-w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 ${ring} shadow-[0_0_0_1px_rgba(0,0,0,0.35)]`}
          aria-hidden
        />
        <p className="pointer-events-none absolute bottom-6 left-0 right-0 text-center text-xs font-medium text-white/75">
          Center your face · hold still
        </p>
      </div>

      <div className="space-y-3 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
        {error ? <p className="text-center text-sm text-[#f5a8a8]">{error}</p> : null}
        <button
          type="button"
          disabled={busy}
          className={`w-full rounded-full py-3.5 text-base font-bold disabled:opacity-50 ${captureBtn}`}
          onClick={() => void capture()}
        >
          {busy ? "Saving…" : "Capture"}
        </button>
        <button
          type="button"
          className="w-full rounded-full border border-white/30 py-3 text-sm font-semibold text-white/90"
          onClick={() => fileRef.current?.click()}
        >
          Choose photo instead
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="user"
        className="sr-only"
        data-testid={fileInputTestId}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            void onCapture(file).then(() => onClose());
          }
          e.target.value = "";
        }}
      />
    </div>
  );
}
