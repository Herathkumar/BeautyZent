"use client";

/** Exact gold Z cut from the client app icon — client launch + loading. */
export const GOLD_Z_LOGO_SRC = "/brand/beautyzent-logo-gold-mark.png";

type SpinProps = {
  /** Visual size in px. Apple-style splash is ~80. */
  size?: number;
  className?: string;
  label?: string;
};

/** Exact icon Z, yawing horizontally (built-in gold shading — no fake extrusion). */
export function GoldLogoSpin({ size = 80, className = "", label = "Loading" }: SpinProps) {
  return (
    <div
      className={`gold-logo-spin ${className}`.trim()}
      style={{ width: size, height: size }}
      role="status"
      aria-label={label}
    >
      <div className="gold-logo-spin__world">
        <div className="gold-logo-spin__stage">
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
