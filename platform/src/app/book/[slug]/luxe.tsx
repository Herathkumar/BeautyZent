"use client";

import { useId, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { formatCad } from "@/lib/money";
import {
  addCalendarDays,
  addCalendarMonths,
  firstDayOfMonth,
  monthGrid,
  upcomingCalendarDays,
  zonedDateTime,
} from "@/lib/salon-time";

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

export function LuxeStarRow({ className = "" }: { className?: string }) {
  return (
    <span className={`book-luxe-stars ${className}`.trim()} aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1.2 9.1 6.9 14.8 8 9.1 9.1 8 14.8 6.9 9.1 1.2 8 6.9 6.9 8 1.2Z" />
        </svg>
      ))}
    </span>
  );
}

export function BookingStepper({
  steps,
  activeIndex,
  onStepClick,
}: {
  steps: readonly string[];
  activeIndex: number;
  onStepClick?: (index: number) => void;
}) {
  const spotlightLeft = `${((activeIndex + 0.5) / steps.length) * 100}%`;

  return (
    <nav className="book-luxe-stepper" aria-label="Booking progress">
      <div className="book-luxe-stepper__track" aria-hidden />
      <div
        className="book-luxe-stepper__spotlight"
        style={{ left: spotlightLeft }}
        aria-hidden
      >
        <span className="book-luxe-stepper__glow" />
        <span className="book-luxe-stepper__marker book-luxe-stepper__marker--active" />
      </div>
      {steps.map((label, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        const canGoBack = Boolean(onStepClick && done);
        return (
          <button
            key={label}
            type="button"
            className={`book-luxe-stepper__step ${active ? "is-active" : ""} ${done ? "is-done" : ""}`}
            disabled={!canGoBack}
            onClick={() => canGoBack && onStepClick?.(i)}
            aria-current={active ? "step" : undefined}
          >
            <span className="book-luxe-stepper__marker-wrap" aria-hidden>
              <span className="book-luxe-stepper__marker" />
            </span>
            <span className="book-luxe-stepper__label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function LuxeContinueButton({
  children,
  disabled,
  onClick,
  type = "button",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="book-luxe-continue"
    >
      {children}
    </button>
  );
}

const STEP_ADVANCE_MS = 1050;

export function LuxeStepContinueButton({
  fromLabel,
  toLabel,
  ready,
  onAdvance,
  autoAdvance = true,
}: {
  fromLabel: string;
  toLabel: string;
  ready: boolean;
  onAdvance: () => void;
  autoAdvance?: boolean;
}) {
  const [animating, setAnimating] = useState(false);
  const wasReady = useRef(ready);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipAnimRef = useRef(false);
  const onAdvanceRef = useRef(onAdvance);
  onAdvanceRef.current = onAdvance;

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (ready && !wasReady.current && autoAdvance) {
      skipAnimRef.current = false;
      setAnimating(true);
      timerRef.current = setTimeout(() => {
        if (!skipAnimRef.current) onAdvanceRef.current();
        setAnimating(false);
        timerRef.current = null;
      }, STEP_ADVANCE_MS);
    }
    if (!ready) {
      clearTimer();
      setAnimating(false);
      skipAnimRef.current = false;
    }
    wasReady.current = ready;
    return clearTimer;
  }, [ready, autoAdvance]);

  function handleClick() {
    skipAnimRef.current = true;
    clearTimer();
    setAnimating(false);
    onAdvance();
  }

  return (
    <div className="book-luxe-continue-row">
      <button
        type="button"
        disabled={!ready}
        onClick={handleClick}
        className={`book-luxe-continue${animating ? " is-glowing" : ""}${
          ready ? " is-ready" : ""
        }`}
        aria-live="polite"
      >
        <span className="book-luxe-continue__inner">
          <span className="book-luxe-continue__prefix">Continue to</span>
          <span className="book-luxe-continue__slide" aria-hidden={animating}>
            <span
              className={`book-luxe-continue__word${
                animating ? " book-luxe-continue__word--out" : ""
              }`}
            >
              {animating ? fromLabel : toLabel}
            </span>
            {animating ? (
              <span className="book-luxe-continue__word book-luxe-continue__word--in">
                {toLabel}
              </span>
            ) : null}
          </span>
          <span className="book-luxe-continue__arrow" aria-hidden>
            →
          </span>
        </span>
      </button>
    </div>
  );
}

export function BookingDateStrip({
  selected,
  timeZone,
  minDate,
  maxDate,
  onSelect,
}: {
  selected: string;
  timeZone: string;
  minDate: string;
  /** Last bookable day (YYYY-MM-DD). Defaults to 90 days after minDate. */
  maxDate?: string;
  onSelect: (ymd: string) => void;
}) {
  const lastDate = maxDate ?? addCalendarDays(minDate, 90, timeZone);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(selected);
  const calendarId = useId();

  const days = useMemo(() => {
    const all = upcomingCalendarDays(91, timeZone, minDate);
    return all.filter((ymd) => ymd <= lastDate);
  }, [minDate, lastDate, timeZone]);

  const monthLabel = useMemo(() => {
    const dt = zonedDateTime(selected, 12, 0, timeZone);
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      month: "long",
      year: "numeric",
    }).format(dt);
  }, [selected, timeZone]);

  const calendarMonthLabel = useMemo(() => {
    const dt = zonedDateTime(viewMonth, 12, 0, timeZone);
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      month: "long",
      year: "numeric",
    }).format(dt);
  }, [viewMonth, timeZone]);

  const gridCells = useMemo(() => monthGrid(viewMonth, timeZone), [viewMonth, timeZone]);

  const minMonth = useMemo(() => firstDayOfMonth(minDate, timeZone), [minDate, timeZone]);
  const maxMonth = useMemo(() => firstDayOfMonth(lastDate, timeZone), [lastDate, timeZone]);
  const viewMonthStart = useMemo(() => firstDayOfMonth(viewMonth, timeZone), [viewMonth, timeZone]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const active = root.querySelector(`[data-date="${selected}"]`);
    active?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [selected]);

  useEffect(() => {
    if (!calendarOpen) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setCalendarOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setCalendarOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [calendarOpen]);

  function scrollStrip(direction: -1 | 1) {
    const root = scrollRef.current;
    if (!root) return;
    root.scrollBy({ left: direction * root.clientWidth * 0.82, behavior: "smooth" });
  }

  function openCalendar() {
    setViewMonth(selected);
    setCalendarOpen((open) => !open);
  }

  function pickDate(ymd: string) {
    onSelect(ymd);
    setCalendarOpen(false);
  }

  function shiftCalendarMonth(delta: number) {
    setViewMonth((prev) => addCalendarMonths(prev, delta, timeZone));
  }

  const canPrevMonth = viewMonthStart > minMonth;
  const canNextMonth = viewMonthStart < maxMonth;

  return (
    <div className="book-date-strip-wrap">
      <button
        type="button"
        className="book-date-strip__nav"
        onClick={() => scrollStrip(-1)}
        aria-label="Previous week"
      >
        ‹
      </button>
      <div className="book-date-strip-panel" ref={panelRef}>
        <button
          type="button"
          className="book-date-strip__month"
          onClick={openCalendar}
          aria-expanded={calendarOpen}
          aria-controls={calendarId}
        >
          <span>{monthLabel}</span>
          <svg className="book-date-strip__month-icon" viewBox="0 0 16 16" aria-hidden>
            <rect x="2.2" y="3.4" width="11.6" height="10.2" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <path d="M2.2 6.2h11.6" stroke="currentColor" strokeWidth="1.2" />
            <path d="M5.4 2.2v2.4M10.6 2.2v2.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>

        {calendarOpen ? (
          <div id={calendarId} className="book-luxe-calendar" role="dialog" aria-label="Choose a date">
            <div className="book-luxe-calendar__head">
              <button
                type="button"
                className="book-date-strip__nav book-luxe-calendar__nav"
                disabled={!canPrevMonth}
                onClick={() => shiftCalendarMonth(-1)}
                aria-label="Previous month"
              >
                ‹
              </button>
              <p className="book-luxe-calendar__title">{calendarMonthLabel}</p>
              <button
                type="button"
                className="book-date-strip__nav book-luxe-calendar__nav"
                disabled={!canNextMonth}
                onClick={() => shiftCalendarMonth(1)}
                aria-label="Next month"
              >
                ›
              </button>
            </div>
            <div className="book-luxe-calendar__dow" aria-hidden>
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="book-luxe-calendar__grid" role="grid">
              {gridCells.map((ymd, i) =>
                ymd ? (
                  <button
                    key={ymd}
                    type="button"
                    role="gridcell"
                    data-date={ymd}
                    disabled={ymd < minDate || ymd > lastDate}
                    onClick={() => pickDate(ymd)}
                    className={`book-luxe-calendar__day ${
                      ymd === selected ? "is-selected" : ""
                    }`}
                    aria-pressed={ymd === selected}
                  >
                    {Number(ymd.split("-")[2])}
                  </button>
                ) : (
                  <span key={`pad-${i}`} className="book-luxe-calendar__pad" aria-hidden />
                )
              )}
            </div>
          </div>
        ) : null}

        <div
          ref={scrollRef}
          className="book-date-strip-scroll"
          role="group"
          aria-label="Choose a day"
        >
          {days.map((ymd) => {
            const dt = zonedDateTime(ymd, 12, 0, timeZone);
            const dow = new Intl.DateTimeFormat("en-CA", {
              timeZone,
              weekday: "short",
            }).format(dt);
            const dayNum = new Intl.DateTimeFormat("en-CA", {
              timeZone,
              day: "numeric",
            }).format(dt);
            const isSelected = ymd === selected;
            return (
              <button
                key={ymd}
                type="button"
                data-date={ymd}
                onClick={() => onSelect(ymd)}
                className={`book-date-strip__day ${isSelected ? "is-selected" : ""}`}
                aria-pressed={isSelected}
              >
                <span className="book-date-strip__dow">{dow}</span>
                <span className="book-date-strip__num">{dayNum}</span>
              </button>
            );
          })}
        </div>
        <p className="book-date-strip__hint">Tap month for calendar · swipe for quick picks</p>
      </div>
      <button
        type="button"
        className="book-date-strip__nav"
        onClick={() => scrollStrip(1)}
        aria-label="Next week"
      >
        ›
      </button>
    </div>
  );
}

function ordinalDay(day: number) {
  const n = day % 100;
  if (n >= 11 && n <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

export function formatBookingSummaryDate(ymd: string, timeZone: string) {
  const dt = zonedDateTime(ymd, 12, 0, timeZone);
  const weekday = new Intl.DateTimeFormat("en-CA", {
    weekday: "long",
    timeZone,
  }).format(dt);
  const month = new Intl.DateTimeFormat("en-CA", { month: "short", timeZone }).format(dt);
  const dayNum = Number(
    new Intl.DateTimeFormat("en-CA", { day: "numeric", timeZone }).format(dt)
  );
  return `${weekday}, ${month} ${ordinalDay(dayNum)}`;
}

export function formatBookingSummaryTime(startsAt: string, timeZone: string) {
  return new Date(startsAt).toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
}

export function BookingSummaryCard({
  serviceLabel,
  servicePriceCents,
  providerName,
  dateLabel,
  timeLabel,
  subtotalCents,
  discountCents,
  discountLabel,
  memberTier,
  totalCents,
  notes,
  onNotesChange,
  stylePreview,
}: {
  serviceLabel: string;
  servicePriceCents: number;
  providerName: string;
  dateLabel: string;
  timeLabel: string;
  subtotalCents: number;
  discountCents: number;
  discountLabel?: string | null;
  memberTier?: string | null;
  totalCents: number;
  notes: string;
  onNotesChange: (value: string) => void;
  stylePreview?: ReactNode;
}) {
  const discountPct =
    discountCents > 0 && subtotalCents > 0
      ? Math.round((discountCents / subtotalCents) * 100)
      : 0;

  return (
    <article className="book-luxe-summary">
      <div className="book-luxe-summary__glow" aria-hidden />
      <div className="book-luxe-summary__inner">
        <h2 className="book-luxe-summary__title font-[family-name:var(--font-display)]">
          Booking Summary
        </h2>
        <dl className="book-luxe-summary__rows">
          <div className="book-luxe-summary__row">
            <dt>Service</dt>
            <dd className="font-[family-name:var(--font-display)]">
              {serviceLabel} ({formatCad(servicePriceCents)})
            </dd>
          </div>
          <div className="book-luxe-summary__row">
            <dt>Provider</dt>
            <dd className="font-[family-name:var(--font-display)]">{providerName}</dd>
          </div>
          <div className="book-luxe-summary__row">
            <dt>Date</dt>
            <dd className="font-[family-name:var(--font-display)]">{dateLabel}</dd>
          </div>
          <div className="book-luxe-summary__row">
            <dt>Time</dt>
            <dd className="font-[family-name:var(--font-display)]">{timeLabel}</dd>
          </div>
        </dl>
        {discountCents > 0 ? (
          <p className="book-luxe-summary__discount">
            {memberTier
              ? `${memberTier} Member Discount Applied`
              : discountLabel || "Discount applied"}
            {discountPct > 0 ? `: -${discountPct}%` : ""} (-{formatCad(discountCents)})
          </p>
        ) : null}
        <div className="book-luxe-summary__rule" aria-hidden />
        <div className="book-luxe-summary__total">
          <span className="font-[family-name:var(--font-display)]">Total</span>
          <strong className="font-[family-name:var(--font-display)]">
            {formatCad(totalCents)}
          </strong>
        </div>
        {stylePreview ? (
          <div className="book-luxe-summary__style">{stylePreview}</div>
        ) : null}
        <label className="book-luxe-summary__notes">
          Special requests
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={3}
            placeholder="Enter your stylist and request…"
            className="book-luxe-summary__notes-input"
          />
        </label>
      </div>
    </article>
  );
}

export function BookingConfirmedOverlay({
  coverUrl,
  stylist,
  startsAt,
  timeZone,
  onViewAppointment,
  onBackHome,
}: {
  coverUrl?: string;
  stylist: string;
  startsAt: string;
  timeZone: string;
  onViewAppointment: () => void;
  onBackHome: () => void;
}) {
  const when = new Date(startsAt).toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });

  return (
    <div
      className="book-luxe-confirm"
      role="dialog"
      aria-modal="true"
      aria-label="Booking confirmed"
      data-testid="booking-confirmed"
    >
      {coverUrl ? (
        <div
          className="book-luxe-confirm__bg"
          style={{ backgroundImage: `url(${coverUrl})` }}
          aria-hidden
        />
      ) : null}
      <div className="book-luxe-confirm__scrim" aria-hidden />
      <div className="book-luxe-confirm__content">
        <div className="book-luxe-confirm__icon" aria-hidden>
          <svg viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M14 24.5 20.5 31 34 17.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="book-luxe-confirm__title">Booking Confirmed!</h2>
        <p className="book-luxe-confirm__body">
          Your appointment is set with {stylist} on {when}. We&apos;ll see you then!
        </p>
        <div className="book-luxe-confirm__actions">
          <button type="button" className="book-luxe-confirm__btn" onClick={onViewAppointment}>
            View appointment
          </button>
          <button type="button" className="book-luxe-confirm__btn" onClick={onBackHome}>
            Back to home
          </button>
        </div>
      </div>
    </div>
  );
}
