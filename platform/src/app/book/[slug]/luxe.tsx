"use client";

import { useId } from "react";

export function LuxeOrnament({ className = "" }: { className?: string }) {
  return (
    <div className={`book-luxe-ornament ${className}`} aria-hidden>
      <span className="book-luxe-ornament__diamond" />
    </div>
  );
}

export function LuxeKickerLined({ children }: { children: React.ReactNode }) {
  return (
    <div className="book-home-kicker">
      <svg className="book-home-kicker__rule" viewBox="0 0 48 8" aria-hidden>
        <path d="M7 4h41" stroke="currentColor" strokeWidth="1.1" />
        <path
          d="M7 1.15 1.4 4 7 6.85"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <p className="book-luxe-kicker">{children}</p>
      <svg className="book-home-kicker__rule" viewBox="0 0 48 8" aria-hidden>
        <path d="M0 4h41" stroke="currentColor" strokeWidth="1.1" />
        <path
          d="M41 1.15 46.6 4 41 6.85"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function LuxeCrown({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M4 16.5 6.2 8l4.1 4.2L12 6.5l1.7 5.7L17.8 8 20 16.5H4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M5 18.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function LuxeSparkle({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden className={className}>
      <path d="M8 1.2 9.1 6.9 14.8 8 9.1 9.1 8 14.8 6.9 9.1 1.2 8 6.9 6.9 8 1.2Z" />
    </svg>
  );
}

export type MemberTier = "silver" | "gold" | "platinum";

const MEMBER_TIERS: Record<
  MemberTier,
  {
    word: string;
    label: string;
    wordSize: number;
    wordTracking: number;
    metal: { hi: string; mid: string; lo: string };
    fill: { inner: string; mid: string };
  }
> = {
  gold: {
    word: "GOLD",
    label: "Gold Member",
    wordSize: 11.4,
    wordTracking: 1.6,
    metal: { hi: "#f3e0b0", mid: "#d4af6a", lo: "#9a6f32" },
    fill: { inner: "#2a1d12", mid: "#120e0a" },
  },
  silver: {
    word: "SILVER",
    label: "Silver Member",
    wordSize: 8.4,
    wordTracking: 0.55,
    metal: { hi: "#f3f4f6", mid: "#c5c9d0", lo: "#7d848e" },
    fill: { inner: "#22262c", mid: "#121418" },
  },
  platinum: {
    word: "PLATINUM",
    label: "Platinum Member",
    wordSize: 6.7,
    wordTracking: 0.28,
    metal: { hi: "#ffffff", mid: "#e6edf4", lo: "#9aa8b8" },
    fill: { inner: "#1c2228", mid: "#0c0e12" },
  },
};

export function memberTierLabel(tier: MemberTier): string {
  return MEMBER_TIERS[tier].label;
}

/** Points needed to reach each tier (inclusive). */
export const MEMBER_TIER_POINTS: Record<MemberTier, number> = {
  silver: 0,
  gold: 250,
  platinum: 1000,
};

export function memberTierFromPoints(points?: number | null): MemberTier {
  const n = Math.max(0, Math.round(points ?? 0));
  if (n >= MEMBER_TIER_POINTS.platinum) return "platinum";
  if (n >= MEMBER_TIER_POINTS.gold) return "gold";
  return "silver";
}

/** Silver < 5 visits, Gold 5–14, Platinum 15+. Unknown counts stay Gold. */
export function memberTierFromVisits(visits?: number | null): MemberTier {
  if (visits == null) return "gold";
  if (visits >= 15) return "platinum";
  if (visits >= 5) return "gold";
  return "silver";
}

export function nextMemberTier(tier: MemberTier): MemberTier | null {
  if (tier === "silver") return "gold";
  if (tier === "gold") return "platinum";
  return null;
}

export function pointsToNextTier(points?: number | null): {
  current: MemberTier;
  next: MemberTier;
  remaining: number;
  threshold: number;
} | null {
  const n = Math.max(0, Math.round(points ?? 0));
  const current = memberTierFromPoints(n);
  const next = nextMemberTier(current);
  if (!next) return null;
  const threshold = MEMBER_TIER_POINTS[next];
  return {
    current,
    next,
    remaining: Math.max(0, threshold - n),
    threshold,
  };
}

const SHIELD =
  "M40 7C52.5 8.5 68 17 71.5 20.5L72 22.5V51C72 70 57.5 86.5 40 94.5C22.5 86.5 8 70 8 51V22.5L8.5 20.5C12 17 27.5 8.5 40 7Z";
const SHIELD_INNER =
  "M40 13.2C51 14.5 63.8 21.4 66.6 24.2L67 25.6V50.4C67 66.8 55.2 81 40 88.2C24.8 81 13 66.8 13 50.4V25.6L13.4 24.2C16.2 21.4 29 14.5 40 13.2Z";

function LaurelLeaves({ metalId }: { metalId: string }) {
  const leaves: Array<[number, number, number]> = [
    [23.1, 72.8, -58],
    [21.8, 67.2, -54],
    [21.0, 61.6, -50],
    [20.7, 56.0, -46],
    [21.0, 50.5, -42],
    [21.8, 45.2, -38],
    [23.1, 40.2, -32],
    [24.8, 35.8, -26],
  ];
  return (
    <g>
      <path
        d="M24.6 74.2c-1.2-8.4-3.6-16.6-2.6-25.2.9-7.6 4.4-14.2 8.2-19.2"
        fill="none"
        stroke={`url(#${metalId})`}
        strokeWidth="0.7"
        strokeLinecap="round"
      />
      {leaves.map(([x, y, r]) => (
        <ellipse
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          rx="3.55"
          ry="1.42"
          fill={`url(#${metalId})`}
          transform={`rotate(${r} ${x} ${y})`}
        />
      ))}
    </g>
  );
}

export function MemberBadge({
  tier = "gold",
  className = "",
}: {
  tier?: MemberTier;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const metalId = `bm-${uid}`;
  const edgeId = `be-${uid}`;
  const fillId = `bf-${uid}`;
  const t = MEMBER_TIERS[tier];
  return (
    <svg
      viewBox="0 0 80 102"
      className={`book-luxe-badge book-luxe-badge--${tier} ${className}`.trim()}
      aria-hidden
    >
      <defs>
        <linearGradient id={metalId} x1="12" y1="8" x2="70" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={t.metal.hi} />
          <stop offset="42%" stopColor={t.metal.mid} />
          <stop offset="100%" stopColor={t.metal.lo} />
        </linearGradient>
        <linearGradient id={edgeId} x1="40" y1="7" x2="40" y2="95" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={t.metal.hi} />
          <stop offset="55%" stopColor={t.metal.mid} />
          <stop offset="100%" stopColor={t.metal.lo} />
        </linearGradient>
        <radialGradient id={fillId} cx="50%" cy="38%" r="68%">
          <stop offset="0%" stopColor={t.fill.inner} />
          <stop offset="100%" stopColor={t.fill.mid} />
        </radialGradient>
      </defs>

      <path d={SHIELD} fill={`url(#${fillId})`} />
      <path d={SHIELD} fill="none" stroke={`url(#${edgeId})`} strokeWidth="1.15" />
      <path d={SHIELD_INNER} fill="none" stroke={`url(#${metalId})`} strokeWidth="2.35" />

      <g fill={`url(#${metalId})`}>
        <path d="M27.2 32.6h25.6v2.7H27.2z" />
        <path d="M27.2 32.6 32.4 22.4 37.2 32.6Z" />
        <path d="M37.2 32.6 40 18.2 42.8 32.6Z" />
        <path d="M42.8 32.6 47.6 22.4 52.8 32.6Z" />
        <circle cx="32.4" cy="21.4" r="1.55" />
        <circle cx="40" cy="17.1" r="1.75" />
        <circle cx="47.6" cy="21.4" r="1.55" />
      </g>

      <LaurelLeaves metalId={metalId} />
      <g transform="translate(80 0) scale(-1 1)">
        <LaurelLeaves metalId={metalId} />
      </g>

      <text
        x="40"
        y="56.5"
        textAnchor="middle"
        fill={`url(#${metalId})`}
        fontSize={t.wordSize}
        fontWeight="700"
        letterSpacing={t.wordTracking}
        fontFamily="var(--font-display), Georgia, 'Times New Roman', serif"
      >
        {t.word}
      </text>
      <text
        x="40"
        y="66.2"
        textAnchor="middle"
        fill={`url(#${metalId})`}
        fontSize="5.4"
        fontWeight="500"
        letterSpacing="1.7"
        fontFamily="var(--font-sans), system-ui, sans-serif"
      >
        MEMBER
      </text>
    </svg>
  );
}

export function LuxeSheet({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="book-luxe-sheet book-theme" role="dialog" aria-label={label}>
      <div className="book-luxe-sheet__panel">{children}</div>
    </div>
  );
}
