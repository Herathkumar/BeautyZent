"use client";

import { useEffect, useMemo, useState } from "react";
import { GoldLogoLoader } from "@/components/GoldLogoSpin";

export type StylistSchedulePayload = {
  stylistId: string;
  stylistName: string;
  date: string;
  timezone: string;
  isOff: boolean;
  working: { startsAt: string; endsAt: string } | null;
  segments: Array<{
    kind: "open" | "busy" | "block";
    startsAt: string;
    endsAt: string;
  }>;
  nextFreeAt: string | null;
  status: "off" | "available" | "busy" | "done";
};

function formatClock(iso: string, timeZone: string) {
  return new Date(iso).toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
}

function statusLabel(status: StylistSchedulePayload["status"]) {
  switch (status) {
    case "available":
      return "Available";
    case "busy":
      return "With a client";
    case "done":
      return "Done for the day";
    case "off":
    default:
      return "Off today";
  }
}

function kindLabel(kind: "open" | "busy" | "block") {
  if (kind === "open") return "Open";
  if (kind === "block") return "Unavailable";
  return "Booked";
}

export function StylistLiveSchedule({
  slug,
  stylistId,
  stylistName,
  date,
  compact = false,
  pollMs = 30_000,
}: {
  slug: string;
  stylistId: string;
  stylistName?: string;
  /** YYYY-MM-DD; omit for salon-local today */
  date?: string;
  compact?: boolean;
  pollMs?: number;
}) {
  const [data, setData] = useState<StylistSchedulePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();

    async function load() {
      setError("");
      try {
        const q = date ? `?date=${encodeURIComponent(date)}` : "";
        const res = await fetch(
          `/api/public/${slug}/stylists/${stylistId}/schedule${q}`,
          { signal: ac.signal, cache: "no-store" }
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Could not load schedule");
        if (!cancelled) setData(json as StylistSchedulePayload);
      } catch (e) {
        if (cancelled || (e instanceof DOMException && e.name === "AbortError")) return;
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load schedule");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    setLoading(true);
    void load();
    const timer = window.setInterval(() => void load(), pollMs);
    return () => {
      cancelled = true;
      ac.abort();
      window.clearInterval(timer);
    };
  }, [slug, stylistId, date, pollMs]);

  const barSegments = useMemo(() => {
    if (!data?.working || data.segments.length === 0) return [];
    const start = new Date(data.working.startsAt).getTime();
    const end = new Date(data.working.endsAt).getTime();
    const span = Math.max(1, end - start);
    return data.segments.map((seg) => {
      const s = new Date(seg.startsAt).getTime();
      const e = new Date(seg.endsAt).getTime();
      return {
        ...seg,
        left: `${((s - start) / span) * 100}%`,
        width: `${(Math.max(0, e - s) / span) * 100}%`,
      };
    });
  }, [data]);

  if (loading && !data) {
    return (
      <div className="book-luxe-card rounded-2xl px-4 py-5">
        <GoldLogoLoader size={48} label="Loading schedule" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="book-luxe-card rounded-2xl px-4 py-4 text-sm text-[#f5a8a8]">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const tz = data.timezone;
  const titleName = stylistName || data.stylistName;

  return (
    <div
      className={`book-luxe-card rounded-2xl ${compact ? "px-3.5 py-3" : "px-4 py-4"}`}
      data-testid="stylist-live-schedule"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="book-luxe-kicker">Live schedule</p>
          {!compact ? (
            <p className="mt-1 font-[family-name:var(--font-display)] text-lg text-champagne">
              {titleName}
            </p>
          ) : null}
          <p className="mt-0.5 text-xs text-muted">
            {new Date(`${data.date}T12:00:00`).toLocaleDateString("en-CA", {
              weekday: "short",
              month: "short",
              day: "numeric",
              timeZone: tz,
            })}
            {data.working
              ? ` · ${formatClock(data.working.startsAt, tz)}–${formatClock(data.working.endsAt, tz)}`
              : null}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase ${
            data.status === "available"
              ? "bg-[rgb(var(--t-accent-rgb)/0.18)] text-champagne"
              : data.status === "busy"
                ? "bg-white/8 text-muted"
                : "bg-white/5 text-muted"
          }`}
        >
          {statusLabel(data.status)}
        </span>
      </div>

      {data.isOff ? (
        <p className="mt-3 text-sm text-muted">Not working this day.</p>
      ) : (
        <>
          <div
            className="relative mt-3 h-3 overflow-hidden rounded-full bg-black/35"
            aria-hidden
          >
            {barSegments.map((seg, i) => (
              <span
                key={`${seg.startsAt}-${i}`}
                className={`absolute inset-y-0 ${
                  seg.kind === "open"
                    ? "bg-[linear-gradient(90deg,#e8c99a,#c9a87c)]"
                    : seg.kind === "block"
                      ? "bg-[#5a5048]"
                      : "bg-[#3a342f]"
                }`}
                style={{ left: seg.left, width: seg.width }}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#d4b483]" aria-hidden />
              Open
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#3a342f]" aria-hidden />
              Booked
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#5a5048]" aria-hidden />
              Unavailable
            </span>
          </div>

          {data.nextFreeAt ? (
            <p className="mt-3 text-sm text-champagne">
              Next opening · {formatClock(data.nextFreeAt, tz)}
            </p>
          ) : data.status === "done" ? (
            <p className="mt-3 text-sm text-muted">No more openings today.</p>
          ) : null}

          {!compact ? (
            <ul className="mt-3 max-h-44 space-y-1.5 overflow-y-auto pr-1">
              {data.segments.map((seg, i) => (
                <li
                  key={`${seg.startsAt}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[color:var(--line)] px-3 py-2 text-xs"
                >
                  <span
                    className={
                      seg.kind === "open" ? "font-semibold text-champagne" : "text-muted"
                    }
                  >
                    {kindLabel(seg.kind)}
                  </span>
                  <span className="tabular-nums text-muted">
                    {formatClock(seg.startsAt, tz)} – {formatClock(seg.endsAt, tz)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
}

export function StylistScheduleSheet({
  open,
  onClose,
  slug,
  stylistId,
  stylistName,
  photoUrl,
  bio,
  date,
  onBook,
}: {
  open: boolean;
  onClose: () => void;
  slug: string;
  stylistId: string;
  stylistName: string;
  photoUrl?: string | null;
  bio?: string | null;
  date?: string;
  onBook?: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center bg-black/55 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`${stylistName} live schedule`}
      onClick={onClose}
    >
      <div
        className="book-card w-full max-w-md overflow-hidden rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 pt-3">
          <div className="flex min-w-0 items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl || "/avatars/stylist-neutral.svg"}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 rounded-full object-cover ring-2 ring-[rgb(var(--t-accent-rgb)/0.45)]"
            />
            <div className="min-w-0">
              <p className="truncate font-[family-name:var(--font-display)] text-xl text-ink">
                {stylistName}
              </p>
              {bio ? <p className="truncate text-xs text-muted">{bio}</p> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[color:var(--line)] px-3 py-1.5 text-xs font-semibold text-champagne"
          >
            Close
          </button>
        </div>

        <div className="space-y-3 px-4 py-4">
          <StylistLiveSchedule
            slug={slug}
            stylistId={stylistId}
            stylistName={stylistName}
            date={date}
          />
          {onBook ? (
            <button
              type="button"
              onClick={onBook}
              className="btn-solid w-full rounded-2xl px-4 py-3 text-sm font-semibold"
            >
              Book with {stylistName.split(" ")[0]}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
