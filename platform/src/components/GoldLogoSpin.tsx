"use client";

import type { CSSProperties } from "react";

/** Transparent 3D gold Z — used for client-app launch and loading. */
export const GOLD_Z_LOGO_SRC = "/brand/beautyzent-logo-gold-mark.png";

/** Extra planes between front and back — thin gold edge, not a heavy slab. */
const EXTRUDE_SLICES = 5;

type SpinProps = {
  /** Visual size in px. Apple-style splash is ~80. */
  size?: number;
  className?: string;
  label?: string;
};

/** Compact gold Z that yaws horizontally with a thin 3D edge. */
export function GoldLogoSpin({ size = 80, className = "", label = "Loading" }: SpinProps) {
  const depth = Math.max(3, Math.round(size * 0.045));

  return (
    <div
      className={`gold-logo-spin ${className}`.trim()}
      style={
        {
          width: size,
          height: size,
          "--gold-depth": `${depth}px`,
          "--slice-n": EXTRUDE_SLICES - 1,
        } as CSSProperties
      }
      role="status"
      aria-label={label}
    >
      <div className="gold-logo-spin__world">
        <div className="gold-logo-spin__stage">
          {Array.from({ length: EXTRUDE_SLICES }, (_, i) => (
            <span
              key={i}
              className="gold-logo-spin__slice"
              style={{ ["--i" as string]: i }}
              aria-hidden
            />
          ))}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={GOLD_Z_LOGO_SRC}
            alt=""
            width={size}
            height={size}
            className="gold-logo-spin__face gold-logo-spin__face--front"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={GOLD_Z_LOGO_SRC}
            alt=""
            width={size}
            height={size}
            className="gold-logo-spin__face gold-logo-spin__face--back"
          />
        </div>
      </div>
    </div>
  );
}

export function GoldLogoLoader({
  fullscreen = false,
  size,
  label = "Loading",
}: {
  fullscreen?: boolean;
  size?: number;
  label?: string;
}) {
  return (
    <div
      className={fullscreen ? "gold-logo-loader gold-logo-loader--full" : "gold-logo-loader"}
      data-testid="gold-logo-loader"
    >
      <GoldLogoSpin size={size ?? (fullscreen ? 80 : 64)} label={label} />
    </div>
  );
}
