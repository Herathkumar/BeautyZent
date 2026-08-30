import Link from "next/link";
import type { ReactNode } from "react";

/** Canonical BeautyZent mark — rose-gold Z used across the marketplace. */
export const BEAUTYZENT_LOGO = "/brand/beautyzent-logo-rose-mark.png";
/** Metallic gold Z — customer display footers. */
export const BEAUTYZENT_LOGO_GOLD = "/brand/beautyzent-logo-gold-mark.png";

export const BEAUTYZENT = {
  name: "BeautyZent",
  tagline: "Premium marketplace for beauty businesses",
  logoLight: BEAUTYZENT_LOGO,
  logoDark: BEAUTYZENT_LOGO,
  logoMark: BEAUTYZENT_LOGO,
  logoRose: BEAUTYZENT_LOGO,
  logoRoseMark: BEAUTYZENT_LOGO,
  logoGoldMark: BEAUTYZENT_LOGO_GOLD,
} as const;

type Size = "sm" | "md" | "lg" | "hero";

const SIZES: Record<Size, { width: number; height: number; className: string }> = {
  sm: { width: 120, height: 120, className: "h-12 w-12" },
  md: { width: 160, height: 160, className: "h-16 w-16" },
  lg: { width: 220, height: 220, className: "h-28 w-28" },
  hero: { width: 320, height: 320, className: "h-40 w-40 sm:h-48 sm:w-48" },
};

/**
 * BeautyZent mark (rose-gold Z). Variants keep sizing/wordmark styling;
 * the image asset is the same everywhere.
 */
export function BeautyZentLogo({
  variant = "light",
  size = "md",
  href = "/",
  showWordmark = false,
  className = "",
  priority = false,
}: {
  variant?: "light" | "dark" | "mark" | "rose" | "gold";
  size?: Size;
  href?: string | null;
  showWordmark?: boolean;
  className?: string;
  priority?: boolean;
}) {
  const dims = SIZES[size];
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BEAUTYZENT_LOGO}
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
