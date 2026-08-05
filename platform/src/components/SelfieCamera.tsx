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

/** Oval guide geometry as fractions of the preview stage (must match CSS overlay). */
const OVAL = {
  cx: 0.5,
  cy: 0.44,
  /** Width as fraction of stage width — large enough for a full face */
  width: 0.86,
  /** height / width (CSS aspect-[3/4] → 4/3) */
  aspect: 4 / 3,
};

export function SelfieCamera({
  open,
  onClose,
  onCapture,
  accent = "stylist",
  fileInputTestId,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
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

      // 1) Paint what object-cover shows (unmirrored)
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

      // 2) Mirror horizontally to match on-screen preview (CSS scaleX(-1))
      const mirrored = document.createElement("canvas");
      mirrored.width = viewW;
      mirrored.height = viewH;
      const mctx = mirrored.getContext("2d");
      if (!mctx) throw new Error("Could not capture");
      mctx.translate(viewW, 0);
      mctx.scale(-1, 1);
      mctx.drawImage(covered, 0, 0);

      // 3) Crop the oval region (square inside oval → circular avatar)
      const ovalW = viewW * OVAL.width;
      const ovalH = ovalW * OVAL.aspect;
      const cx = viewW * OVAL.cx;
      const cy = viewH * OVAL.cy;
      const side = Math.min(ovalW, ovalH);
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
      await onCapture(file);
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
  const ring = accent === "manager" ? "border-[#f0c987]" : "border-[#b5ebe0]";

  const ovalWidthPct = `${OVAL.width * 100}%`;
  const ovalTopPct = `${OVAL.cy * 100}%`;
  const gradRx = `${(OVAL.width / 2) * 100}%`;
  const gradRy = `${((OVAL.width * OVAL.aspect) / 2) * 100}%`;

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col bg-black"
      role="dialog"
      aria-label="Take selfie"
      data-testid="selfie-camera"
    >
      <div className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="text-sm font-semibold tracking-wide text-white/90">
          Fit your face in the oval
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
        className="relative mx-auto w-full max-w-lg flex-1 overflow-hidden bg-black"
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
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(ellipse ${gradRx} ${gradRy} at 50% ${ovalTopPct}, transparent 0%, transparent 69%, rgba(0,0,0,0.72) 71%)`,
          }}
        />
        <div
          className={`pointer-events-none absolute left-1/2 aspect-[3/4] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-[3px] ${ring}`}
          style={{ width: ovalWidthPct, top: ovalTopPct, maxWidth: "none" }}
          aria-hidden
        />
        <p className="pointer-events-none absolute bottom-6 left-0 right-0 text-center text-xs font-medium text-white/75">
          Center your face · what&apos;s in the oval is saved
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
            void Promise.resolve(onCapture(file)).then(() => onClose());
          }
          e.target.value = "";
        }}
      />
    </div>
  );
}
