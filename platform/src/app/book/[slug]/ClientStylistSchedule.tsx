"use client";

import { useEffect, useMemo, useState } from "react";
import { GoldLogoLoader } from "@/components/GoldLogoSpin";
import {
  clockParts,
  formatHourLabel,
  hourMarks,
  timelineCardBox,
} from "@/lib/display-schedule";
import {
  addCalendarDays,
  addCalendarMonths,
  calendarDateInTz,
  firstDayOfMonth,
  mondayOfWeekContaining,
  monthGrid,
  upcomingCalendarDays,
  weekDayKeys,
} from "@/lib/salon-time";

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

type CalendarView = "day" | "week" | "month";

const HOUR_PX = 72;
const MIN_BLOCK_H = 28;

function formatClock(iso: string, timeZone: string) {
  return new Date(iso).toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
}

function statusAvailabilityLabel(status: StylistSchedulePayload["status"]) {
  if (status === "available") return "Available today";
  if (status === "busy") return "Busy now · openings later";
  if (status === "done") return "Done for the day";
  return "Off today";
}

function specialtyFromBio(bio?: string | null) {
  const line = (bio || "").split(/[.\n]/)[0]?.trim();
  if (line && line.length < 42) return line;
  return "Stylist";
}

function locationShort(address?: string | null, salonName?: string | null) {
  if (!address) return salonName || "";
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return `${parts[parts.length - 2]}`;
  return parts[0] || salonName || "";
}

export type ClientScheduleService = {
  name: string;
  durationMin: number;
  priceCents: number;
};

export function ClientStylistSchedule({
  slug,
  stylistId,
  stylistName,
  photoUrl,
  bio,
  salonName,
  salonAddress,
  date,
  minDate,
  slots = [],
  startsAt = "",
  service,
  onSelectDate,
  onSelectSlot,
  onContinue,
  onEditService,
  compact = false,
  showFooter = false,
  pollMs = 30_000,
}: {
  slug: string;
  stylistId: string;
  stylistName?: string;
  photoUrl?: string | null;
  bio?: string | null;
  salonName?: string | null;
  salonAddress?: string | null;
  date?: string;
  minDate?: string;
  slots?: string[];
  startsAt?: string;
  service?: ClientScheduleService | null;
  onSelectDate?: (ymd: string) => void;
  onSelectSlot?: (iso: string) => void;
  onContinue?: () => void;
  onEditService?: () => void;
  compact?: boolean;
  showFooter?: boolean;
  pollMs?: number;
}) {
  const [data, setData] = useState<StylistSchedulePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<CalendarView>(compact ? "day" : "day");
  const [localDate, setLocalDate] = useState(date || "");

  const selectedYmd = date || localDate;

  useEffect(() => {
    if (date) setLocalDate(date);
  }, [date]);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();

    async function load(isInitial: boolean) {
      setError("");
      try {
        const q = selectedYmd ? `?date=${encodeURIComponent(selectedYmd)}` : "";
        const res = await fetch(
          `/api/public/${slug}/stylists/${stylistId}/schedule${q}`,
          { signal: ac.signal, cache: "no-store" }
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Could not load schedule");
        if (!cancelled) {
          const payload = json as StylistSchedulePayload;
          setData(payload);
          if (!date && !selectedYmd) setLocalDate(payload.date);
        }
      } catch (e) {
        if (cancelled || (e instanceof DOMException && e.name === "AbortError")) return;
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load schedule");
          setData(null);
        }
      } finally {
        if (!cancelled && isInitial) setLoading(false);
      }
    }

    if (!data) setLoading(true);
    void load(true);
    const timer = window.setInterval(() => void load(false), pollMs);
    return () => {
      cancelled = true;
      ac.abort();
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch when schedule identity/date changes
  }, [slug, stylistId, selectedYmd, pollMs]);

  function pickDate(ymd: string) {
    setLocalDate(ymd);
    onSelectDate?.(ymd);
    setView("day");
  }

  const tz = data?.timezone || "America/Toronto";
  const titleName = stylistName || data?.stylistName || "Stylist";
  const floor = minDate || calendarDateInTz(tz);

  const openHour = useMemo(() => {
    if (!data?.working) return 9;
    return clockParts(data.working.startsAt, tz).hour;
  }, [data, tz]);

  const closeHour = useMemo(() => {
    if (!data?.working) return 18;
    const parts = clockParts(data.working.endsAt, tz);
    return Math.max(openHour + 1, parts.minute > 0 ? parts.hour + 1 : parts.hour || 24);
  }, [data, tz, openHour]);

  const busyBlocks = useMemo(() => {
    if (!data) return [];
    return data.segments.filter((s) => s.kind === "busy" || s.kind === "block");
  }, [data]);

  const stripStart = useMemo(() => {
    if (!selectedYmd) return floor;
    return addCalendarDays(selectedYmd, -2, tz);
  }, [selectedYmd, floor, tz]);

  const stripDays = useMemo(
    () => upcomingCalendarDays(7, tz, stripStart < floor ? floor : stripStart),
    [tz, stripStart, floor]
  );

  const monthLabel = useMemo(() => {
    if (!selectedYmd) return "";
    return new Date(`${selectedYmd}T12:00:00`).toLocaleDateString("en-CA", {
      month: "long",
      year: "numeric",
      timeZone: tz,
    });
  }, [selectedYmd, tz]);

  const footerLabel = useMemo(() => {
    if (!startsAt || !selectedYmd) return "";
    const day = new Date(`${selectedYmd}T12:00:00`).toLocaleDateString("en-CA", {
      weekday: "short",
      day: "numeric",
      timeZone: tz,
    });
    return `${day} · ${formatClock(startsAt, tz)}`;
  }, [startsAt, selectedYmd, tz]);

  if (loading && !data) {
    return (
      <div className="bz-client-cal">
        <GoldLogoLoader size={48} label="Loading schedule" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bz-client-cal">
        <p className="px-4 py-4 text-sm text-[#b85a4a]">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const hours = hourMarks(openHour, closeHour);
  const openMin = openHour * 60;
  const spanMin = Math.max(60, (closeHour - openHour) * 60);
  const height = hours.length * HOUR_PX;
  const durationMin = service?.durationMin || 75;

  return (
    <div
      className={`bz-client-cal${compact ? " is-compact" : ""}`}
      data-testid="stylist-live-schedule"
    >
      {!compact ? (
        <header className="bz-client-cal__profile">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl || "/avatars/stylist-neutral.svg"}
            alt=""
            className="bz-client-cal__avatar"
          />
          <div className="min-w-0 flex-1">
            <p className="bz-client-cal__name">{titleName}</p>
            <p className="bz-client-cal__meta">
              {specialtyFromBio(bio)}
              {locationShort(salonAddress, salonName)
                ? ` · ${locationShort(salonAddress, salonName)}`
                : ""}
            </p>
            <span
              className={`bz-client-cal__avail${
                data.status === "available" ? " is-open" : ""
              }`}
            >
              <i />
              {statusAvailabilityLabel(data.status)}
            </span>
          </div>
        </header>
      ) : null}

      {service ? (
        <div className="bz-client-cal__service">
          <div className="min-w-0">
            <p className="font-semibold text-[#1a1a1a]">{service.name}</p>
            <p className="text-sm text-[#666]">
              {service.durationMin} min · ${(service.priceCents / 100).toFixed(0)}
            </p>
          </div>
          {onEditService ? (
            <button
              type="button"
              className="bz-client-cal__edit"
              aria-label="Edit service"
              onClick={onEditService}
            >
              ✎
            </button>
          ) : null}
        </div>
      ) : null}

      {!compact ? (
        <div className="bz-client-cal__tabs" role="tablist" aria-label="Schedule view">
          {(["day", "week", "month"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              className={view === v ? "is-active" : undefined}
              onClick={() => setView(v)}
              data-testid={`client-cal-view-${v}`}
            >
              {v[0]!.toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      ) : null}

      {view === "day" ? (
        <>
          <div className="bz-client-cal__strip-wrap">
            <button
              type="button"
              className="bz-client-cal__strip-nav"
              aria-label="Previous week"
              onClick={() =>
                pickDate(addCalendarDays(selectedYmd || floor, -7, tz))
              }
            >
              ‹
            </button>
            <div className="bz-client-cal__strip" role="listbox" aria-label="Pick a day">
              {stripDays.map((ymd) => {
                const active = ymd === selectedYmd;
                const wd = new Date(`${ymd}T12:00:00`).toLocaleDateString("en-CA", {
                  weekday: "short",
                  timeZone: tz,
                });
                const num = Number(ymd.slice(8, 10));
                const disabled = ymd < floor;
                return (
                  <button
                    key={ymd}
                    type="button"
                    role="option"
                    aria-selected={active}
                    data-date={ymd}
                    disabled={disabled}
                    className={`bz-client-cal__daychip book-date-strip__day${active ? " is-active" : ""}`}
                    onClick={() => pickDate(ymd)}
                  >
                    <span>{wd}</span>
                    <strong>{num}</strong>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="bz-client-cal__strip-nav"
              aria-label="Next week"
              onClick={() =>
                pickDate(addCalendarDays(selectedYmd || floor, 7, tz))
              }
            >
              ›
            </button>
          </div>
          <p className="bz-client-cal__monthlabel">{monthLabel}</p>

          {data.isOff ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-[#666]">Not working this day.</p>
              <button
                type="button"
                className="mt-3 text-sm font-semibold text-[#b88e4f]"
                onClick={() => pickDate(addCalendarDays(selectedYmd || floor, 1, tz))}
              >
                See next day →
              </button>
            </div>
          ) : (
            <div className="bz-client-cal__scroll">
              <div className="bz-client-cal__quarters" aria-hidden>
                <span />
                <span>15</span>
                <span>30</span>
                <span>45</span>
              </div>
              <div
                className="bz-client-cal__grid"
                style={{ height, gridTemplateColumns: "3rem 1fr" }}
              >
                <div className="relative" style={{ height }}>
                  {hours.map((h, i) => (
                    <p
                      key={h}
                      className="bz-client-cal__hour"
                      style={{ top: i * HOUR_PX - 6 }}
                    >
                      {formatHourLabel(h).replace(":00 ", " ")}
                    </p>
                  ))}
                </div>
                <div className="bz-client-cal__lane" style={{ height }}>
                  {hours.map((h, i) => (
                    <div
                      key={h}
                      className="bz-client-cal__hline"
                      style={{ top: i * HOUR_PX }}
                    />
                  ))}
                  {[0.25, 0.5, 0.75].map((q) =>
                    hours.map((h, i) => (
                      <div
                        key={`${h}-${q}`}
                        className="bz-client-cal__hline is-quarter"
                        style={{ top: i * HOUR_PX + HOUR_PX * q }}
                      />
                    ))
                  )}
                  {busyBlocks.map((seg, i) => {
                    const box = timelineCardBox(
                      { ...seg, status: "BOOKED" },
                      new Date(),
                      openMin,
                      spanMin,
                      height,
                      MIN_BLOCK_H,
                      tz
                    );
                    const blocked = seg.kind === "block";
                    return (
                      <div
                        key={`${seg.startsAt}-${i}`}
                        className={`bz-client-cal__block${blocked ? " is-blocked" : ""}`}
                        style={{ top: box.top, height: box.height }}
                      >
                        {blocked ? "Unavailable" : "Booked"}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {onSelectSlot ? (
            <div className="bz-client-cal__slots">
              {slots.length === 0 ? (
                <p className="px-1 py-2 text-center text-sm text-[#666]">
                  {data.isOff
                    ? "No openings this day."
                    : "No open times for this service — try another day."}
                </p>
              ) : (
                slots.slice(0, 6).map((slot) => {
                  const selected = startsAt === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      data-slot-day={calendarDateInTz(tz, new Date(slot))}
                      className={`bz-client-cal__slot${selected ? " is-selected" : ""}`}
                      onClick={() => onSelectSlot(slot)}
                    >
                      {selected ? <span className="bz-client-cal__check">✓</span> : null}
                      <span className="bz-client-cal__slot-time">
                        {formatClock(slot, tz)}
                      </span>
                      <span className="bz-client-cal__slot-meta">
                        Open · {durationMin} min
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          ) : null}

          <p className="bz-client-cal__privacy">
            Only open times are shown with names hidden
            <span aria-hidden> · 👁</span>
          </p>
        </>
      ) : null}

      {view === "week" ? (
        <WeekPicker
          selectedYmd={selectedYmd}
          timeZone={tz}
          minDate={floor}
          busyByProxy={busyBlocks.length > 0}
          onPick={pickDate}
        />
      ) : null}

      {view === "month" ? (
        <MonthPicker
          selectedYmd={selectedYmd}
          timeZone={tz}
          minDate={floor}
          onPick={pickDate}
        />
      ) : null}

      {showFooter && onContinue ? (
        <div className="bz-client-cal__footer">
          <p className="bz-client-cal__footer-summary">
            {footerLabel || "Pick an open time"}
          </p>
          <button
            type="button"
            className="bz-client-cal__cta"
            disabled={!startsAt}
            onClick={onContinue}
            data-testid="client-cal-continue"
          >
            Continue to book
          </button>
        </div>
      ) : null}
    </div>
  );
}

function WeekPicker({
  selectedYmd,
  timeZone,
  minDate,
  onPick,
}: {
  selectedYmd: string;
  timeZone: string;
  minDate: string;
  busyByProxy?: boolean;
  onPick: (ymd: string) => void;
}) {
  const monday = mondayOfWeekContaining(selectedYmd || minDate, timeZone);
  const days = weekDayKeys(monday, timeZone);
  return (
    <div className="bz-client-cal__weekpick" data-testid="client-cal-week">
      <div className="bz-client-cal__weekpick-nav">
        <button
          type="button"
          aria-label="Previous week"
          onClick={() => onPick(addCalendarDays(monday, -7, timeZone))}
        >
          ‹
        </button>
        <span>
          {new Date(`${monday}T12:00:00`).toLocaleDateString("en-CA", {
            month: "short",
            day: "numeric",
            timeZone,
          })}
          {" – "}
          {new Date(`${addCalendarDays(monday, 6, timeZone)}T12:00:00`).toLocaleDateString(
            "en-CA",
            { month: "short", day: "numeric", year: "numeric", timeZone }
          )}
        </span>
        <button
          type="button"
          aria-label="Next week"
          onClick={() => onPick(addCalendarDays(monday, 7, timeZone))}
        >
          ›
        </button>
      </div>
      <div className="bz-client-cal__weekpick-grid">
        {days.map((ymd) => {
          const disabled = ymd < minDate;
          const active = ymd === selectedYmd;
          const wd = new Date(`${ymd}T12:00:00`).toLocaleDateString("en-CA", {
            weekday: "short",
            timeZone,
          });
          return (
            <button
              key={ymd}
              type="button"
              disabled={disabled}
              className={active ? "is-active" : undefined}
              onClick={() => onPick(ymd)}
            >
              <span>{wd}</span>
              <strong>{Number(ymd.slice(8, 10))}</strong>
            </button>
          );
        })}
      </div>
      <p className="bz-client-cal__hint">Select a day to see open times.</p>
    </div>
  );
}

function MonthPicker({
  selectedYmd,
  timeZone,
  minDate,
  onPick,
}: {
  selectedYmd: string;
  timeZone: string;
  minDate: string;
  onPick: (ymd: string) => void;
}) {
  const [anchor, setAnchor] = useState(selectedYmd || minDate);
  const grid = monthGrid(anchor, timeZone);
  const label = new Date(`${firstDayOfMonth(anchor, timeZone)}T12:00:00`).toLocaleDateString(
    "en-CA",
    { month: "long", year: "numeric", timeZone }
  );

  return (
    <div className="bz-client-cal__monthpick" data-testid="client-cal-month">
      <div className="bz-client-cal__weekpick-nav">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setAnchor(addCalendarMonths(anchor, -1, timeZone))}
        >
          ‹
        </button>
        <span>{label}</span>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setAnchor(addCalendarMonths(anchor, 1, timeZone))}
        >
          ›
        </button>
      </div>
      <div className="bz-client-cal__month-wd">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={`${d}-${i}`}>{d}</span>
        ))}
      </div>
      <div className="bz-client-cal__month-grid">
        {grid.map((ymd, i) => {
          if (!ymd) return <span key={`pad-${i}`} />;
          const disabled = ymd < minDate;
          const active = ymd === selectedYmd;
          const outside = ymd.slice(0, 7) !== anchor.slice(0, 7);
          return (
            <button
              key={ymd}
              type="button"
              disabled={disabled}
              className={`${active ? "is-active" : ""}${outside ? " is-outside" : ""}`}
              onClick={() => onPick(ymd)}
            >
              {Number(ymd.slice(8, 10))}
            </button>
          );
        })}
      </div>
      <p className="bz-client-cal__hint">Select a day to see open times.</p>
    </div>
  );
}
