import Link from "next/link";
import type { ReactNode } from "react";

export const BEAUTYZENT = {
  name: "BeautyZent",
  tagline: "Premium marketplace for beauty businesses",
  logoLight: "/brand/beautyzent-logo-rose.png",
  logoDark: "/brand/beautyzent-logo-rose.png",
  logoMark: "/brand/beautyzent-logo-rose-mark.png",
  logoRose: "/brand/beautyzent-logo-rose.png",
  logoRoseMark: "/brand/beautyzent-logo-rose-mark.png",
} as const;

type Size = "sm" | "md" | "lg" | "hero";

const SIZES: Record<Size, { width: number; height: number; className: string }> = {
  sm: { width: 120, height: 120, className: "h-10 w-10" },
  md: { width: 160, height: 160, className: "h-14 w-14" },
  lg: { width: 220, height: 220, className: "h-24 w-24" },
  hero: { width: 320, height: 320, className: "h-36 w-36 sm:h-44 sm:w-44" },
};

/**
 * BeautyZent wordmark / mark.
 * - light / dark: full gold lockup with a transparent background
 * - mark: gold Z only, transparent PNG (headers)
 * - rose: rose-gold Z only, transparent PNG (Explore preview)
 */
export function BeautyZentLogo({
  variant = "light",
  size = "md",
  href = "/",
  showWordmark = false,
  className = "",
  priority = false,
}: {
  variant?: "light" | "dark" | "mark" | "rose";
  size?: Size;
  href?: string | null;
  showWordmark?: boolean;
  className?: string;
  priority?: boolean;
}) {
  const dims = SIZES[size];
  const src =
    variant === "rose"
      ? BEAUTYZENT.logoRoseMark
      : variant === "mark"
      ? BEAUTYZENT.logoMark
      : variant === "dark"
        ? BEAUTYZENT.logoDark
        : BEAUTYZENT.logoLight;
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={BEAUTYZENT.name}
      width={dims.width}
      height={dims.height}
      className={`${dims.className} bg-transparent object-contain ${className}`.trim()}
      {...(priority ? { fetchPriority: "high" as const } : {})}
    />
  );

  const content = showWordmark ? (
    <span className="inline-flex items-center gap-3">
      {img}
      <span className="grid leading-tight">
        <span
          className={`font-[family-name:var(--font-display)] text-xl tracking-tight ${
            variant === "dark" || variant === "mark" ? "text-[#e8c9a0]" : "text-ink"
          }`}
        >
          {BEAUTYZENT.name}
        </span>
        <span
          className={`text-[0.65rem] font-semibold tracking-[0.16em] uppercase ${
            variant === "dark" || variant === "mark" ? "text-[#c4a574]/80" : "text-cocoa"
          }`}
        >
          {BEAUTYZENT.tagline}
        </span>
      </span>
    </span>
  ) : (
    img
  );

  if (!href) return content;
  return (
    <Link href={href} className="inline-flex shrink-0" aria-label={BEAUTYZENT.name}>
      {content}
    </Link>
  );
}

/** Compact header bar used on explore / claim / marketplace landing. */
export function BeautyZentMarketHeader({
  right,
}: {
  right?: ReactNode;
}) {
  return (
    <div className="border-b border-ink/10 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-end gap-3 px-4 py-2.5 sm:px-6">
        <div className="flex flex-wrap items-center justify-end gap-3 text-sm">{right}</div>
      </div>
    </div>
  );
}
