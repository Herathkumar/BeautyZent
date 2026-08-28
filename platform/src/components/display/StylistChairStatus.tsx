"use client";

import { useId } from "react";
import {
  stylistChairCaption,
  type StylistWaitInfo,
  type StylistWaitKind,
} from "@/lib/display-schedule";

export function customerWaitToneClass(kind: StylistWaitKind) {
  if (kind === "available") return "customer-stylist-chair--ok";
  if (kind === "waiting") return "customer-stylist-chair--busy";
  if (kind === "opens") return "customer-stylist-chair--soon";
  return "customer-stylist-chair--off";
}

export function StylistNeonArrow() {
  const id = useId().replace(/:/g, "");
  return (
    <svg className="customer-stylist-head__arrow" viewBox="0 0 64 48" fill="none" aria-hidden>
      <defs>
        <marker id={`arr-${id}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0 .5 7.5 4 0 7.5Z" fill="currentColor" />
        </marker>
      </defs>
      <path
        d="M4 24c16 1 28-4 56-4"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        markerEnd={`url(#arr-${id})`}
      />
    </svg>
  );
}

/** Vintage barber chair: quilted leather + chrome, neon silhouette. */
function BarberChairIllustration() {
  const id = useId().replace(/:/g, "");
  const chrome = `chr-${id}`;
  const chromeV = `chrv-${id}`;
  const leather = `lth-${id}`;
  const quilt = `qlt-${id}`;
  const clipBack = `cb-${id}`;
  const clipSeat = `cs-${id}`;
  const clipHead = `ch-${id}`;

  const backD =
    "M64 48c8-12 28-18 50-16 22 2 38 14 40 30v78c-2 16-22 26-48 28-26 2-46-8-48-24V48Z";
  const seatD =
    "M42 128c10-14 38-20 70-18 28 2 48 12 50 26-2 18-16 32-42 36H70c-18-2-30-14-28-44Z";
  const headD = "M78 28c0-16 14-26 32-26s32 10 32 26c0 9-6 16-14 19H92c-8-3-14-10-14-19Z";

  return (
    <svg className="customer-stylist-chair__icon" viewBox="0 0 200 290" fill="none" aria-hidden>
      <defs>
        <linearGradient id={chrome} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f8fbff" />
          <stop offset="18%" stopColor="#d4dee8" />
          <stop offset="40%" stopColor="#8e9caa" />
          <stop offset="58%" stopColor="#eef3f8" />
          <stop offset="82%" stopColor="#6d7a88" />
          <stop offset="100%" stopColor="#c5d0dc" />
        </linearGradient>
        <linearGradient id={chromeV} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f2f6fa" />
          <stop offset="32%" stopColor="#8b97a5" />
          <stop offset="62%" stopColor="#f4f7fb" />
          <stop offset="100%" stopColor="#5e6874" />
        </linearGradient>
        <linearGradient id={leather} x1="0.15" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#2c332c" />
          <stop offset="40%" stopColor="#141814" />
          <stop offset="100%" stopColor="#070907" />
        </linearGradient>
        <pattern id={quilt} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45 7 7)">
          <rect width="14" height="14" fill="none" stroke="#4e584c" strokeWidth="0.85" opacity="0.55" />
          <path d="M0 7h14M7 0v14" stroke="#080a08" strokeWidth="0.4" opacity="0.4" />
        </pattern>
        <clipPath id={clipBack}>
          <path d={backD} />
        </clipPath>
        <clipPath id={clipSeat}>
          <path d={seatD} />
        </clipPath>
        <clipPath id={clipHead}>
          <path d={headD} />
        </clipPath>
      </defs>

      {/* Chrome hydraulic base */}
      <ellipse cx="98" cy="268" rx="82" ry="16" fill={`url(#${chrome})`} />
      <ellipse cx="98" cy="268" rx="82" ry="16" fill="none" stroke="currentColor" strokeWidth="2.6" />
      <ellipse cx="98" cy="264" rx="56" ry="9" fill="#121416" opacity="0.28" />
      <ellipse cx="98" cy="262" rx="24" ry="5" fill={`url(#${chrome})`} />
      <path d="M28 264c22-10 48-14 70-14s48 4 70 14" fill="none" stroke="#fff" strokeWidth="1.4" opacity="0.28" />

      {/* Pump lever */}
      <path
        d="M116 214c28 8 48 26 54 40"
        fill="none"
        stroke={`url(#${chrome})`}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path d="M116 214c28 8 48 26 54 40" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
      <ellipse cx="172" cy="256" rx="16" ry="6" fill={`url(#${chrome})`} />
      <ellipse cx="172" cy="256" rx="16" ry="6" fill="none" stroke="currentColor" strokeWidth="2" />

      {/* Piston */}
      <path
        d="M84 176c0-4 3-6 8-6h20c5 0 8 2 8 6v78c0 5-3 8-8 8H92c-5 0-8-3-8-8v-78Z"
        fill={`url(#${chromeV})`}
      />
      <path
        d="M84 176c0-4 3-6 8-6h20c5 0 8 2 8 6v78c0 5-3 8-8 8H92c-5 0-8-3-8-8v-78Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <rect x="80" y="214" width="44" height="9" rx="2.5" fill={`url(#${chrome})`} />
      <rect x="80" y="214" width="44" height="9" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />

      {/* Large chrome footrest */}
      <path d="M62 168v28" stroke={`url(#${chrome})`} strokeWidth="7" strokeLinecap="round" />
      <path d="M134 166v30" stroke={`url(#${chrome})`} strokeWidth="7" strokeLinecap="round" />
      <ellipse cx="98" cy="202" rx="64" ry="15" fill={`url(#${chrome})`} />
      <ellipse cx="98" cy="202" rx="64" ry="15" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M46 200h104" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.3" />

      {/* Quilted leather back */}
      <path d={backD} fill={`url(#${leather})`} />
      <g clipPath={`url(#${clipBack})`}>
        <rect x="48" y="28" width="102" height="122" fill={`url(#${quilt})`} />
      </g>
      <path d={backD} fill="none" stroke="currentColor" strokeWidth="2.8" />

      {/* Headrest */}
      <path d="M104 46v10" stroke={`url(#${chrome})`} strokeWidth="6" strokeLinecap="round" />
      <path d={headD} fill={`url(#${leather})`} />
      <g clipPath={`url(#${clipHead})`}>
        <rect x="74" y="0" width="72" height="50" fill={`url(#${quilt})`} />
      </g>
      <path d={headD} fill="none" stroke="currentColor" strokeWidth="2.8" />

      {/* Quilted leather seat */}
      <path d={seatD} fill={`url(#${leather})`} />
      <g clipPath={`url(#${clipSeat})`}>
        <rect x="40" y="108" width="120" height="58" fill={`url(#${quilt})`} />
      </g>
      <path d={seatD} fill="none" stroke="currentColor" strokeWidth="2.8" />
      <path d="M52 148c12 10 36 14 52 14 18 0 40-4 52-14" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.4" />

      {/* Chrome arm tubes */}
      <path
        d="M60 78c-34 8-48 36-42 64 6 24 32 34 52 26"
        fill="none"
        stroke={`url(#${chrome})`}
        strokeWidth="11"
        strokeLinecap="round"
      />
      <path
        d="M60 78c-34 8-48 36-42 64 6 24 32 34 52 26"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M56 82c-28 8-38 32-34 54"
        fill="none"
        stroke="#fff"
        strokeWidth="1.6"
        opacity="0.35"
        strokeLinecap="round"
      />

      <path
        d="M142 80c32 8 44 34 38 60-6 22-30 32-48 24"
        fill="none"
        stroke={`url(#${chrome})`}
        strokeWidth="9.5"
        strokeLinecap="round"
      />
      <path
        d="M142 80c32 8 44 34 38 60-6 22-30 32-48 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.7"
        strokeLinecap="round"
      />
      <path
        d="M146 84c24 8 32 28 28 48"
        fill="none"
        stroke="#fff"
        strokeWidth="1.4"
        opacity="0.32"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function StylistChairStatus({
  wait,
  guestName,
  dropActive,
  dropTarget,
  variant = "portrait",
}: {
  wait: StylistWaitInfo;
  guestName?: string | null;
  dropActive?: boolean;
  dropTarget?: boolean;
  variant?: "portrait" | "lounge";
}) {
  const caption = stylistChairCaption(wait, guestName);
  const seated = wait.kind === "waiting" && Boolean(guestName);
  const aria = seated ? `${caption} in chair` : caption;
  const lounge = variant === "lounge";

  return (
    <div
      data-testid="customer-stylist-wait"
      data-wait-kind={wait.kind}
      className={`customer-stylist-chair ${customerWaitToneClass(wait.kind)}${lounge ? " customer-stylist-chair--lounge" : ""}${dropActive ? " customer-stylist-chair--drop-hot" : ""}${dropTarget ? " customer-stylist-chair--drop-target" : ""}`}
      title={wait.label}
      aria-label={aria}
    >
      {lounge ? <span className="customer-stylist-chair__dot" aria-hidden /> : null}
      {lounge ? <span className="customer-stylist-chair__label">{caption}</span> : null}
      <BarberChairIllustration />
      {lounge ? null : <span className="customer-stylist-chair__label">{caption}</span>}
      {lounge ? null : <span className="customer-stylist-chair__flare" aria-hidden />}
    </div>
  );
}
