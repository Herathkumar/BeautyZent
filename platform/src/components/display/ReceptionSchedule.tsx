"use client";

import { useEffect, useRef, useState } from "react";
import { hitChairDrop, resolveDropTarget, type ChairDrag } from "@/components/display/chair-drop";
import { StylistChairStatus } from "@/components/display/StylistChairStatus";
import { useConfirm } from "@/components/ConfirmDialog";
import { ServiceGlyph } from "./ServiceGlyph";
import {
  canChairCheckIn,
  chairAcceptsDrop,
  clockParts,
  firstName,
  formatClock,
  formatHourLabel,
  formatMinutesClock,
  hourMarks,
  HOUR_PX,
  initials,
  seatedServiceProgress,
  serviceKind,
  statusLabel,
  stylistChairVisual,
  stylistCurrentGuest,
  stylistFloorTone,
  stylistStatusDotClass,
  stylistStatusRingClass,
  stylistWaitInfo,
  timelineCardBox,
  type DisplayAppt,
  type DisplayStylist,
} from "@/lib/display-schedule";
import { addCalendarDays } from "@/lib/salon-time";
import { stylistUtilization } from "@/components/display/ReceptionDailyMetrics";
import { ActiveProgressBar } from "./CustomerScheduleGrid";

function StylistUtilRing({ pct }: { pct: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div className="reception-stylist-util" aria-hidden>
      <svg viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--rx-line)" strokeWidth="3.5" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="var(--rx-util-ring)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          transform="rotate(-90 36 36)"
        />
      </svg>
      <span className="reception-stylist-util__pct">{pct}%</span>
    </div>
  );
}

function DurationBar({ startsAt, endsAt }: { startsAt: string; endsAt: string }) {
  const min = Math.max(0, (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000);
  const pct = Math.min(100, (min / 180) * 100);
  return (
    <div className="mt-1 h-[2px] w-[50%] rounded-full bg-[color-mix(in_srgb,var(--rx-accent)_15%,transparent)] overflow-hidden">
      <div className="h-full rounded-full bg-[var(--rx-accent)]" style={{ width: `${pct}%`, opacity: 0.6 }} />
    </div>
  );
}

export function ReceptionSchedule({
  appointments,
  stylists,
  openHour,
  closeHour,
  timeZone,
  selectedId,
  onSelect,
  now,
  compact = false,
  storeClosed = false,
  nameMode = "full",
  scheduleDay,
  todayKey,
  scheduleDayLabel,
  scheduleMinDay,
  scheduleMaxDay,
  onScheduleDayChange,
  onCheckIn,
  onCheckout,
  hideEmptyState = false,
  audience = "reception",
}: {
  appointments: DisplayAppt[];
  stylists: DisplayStylist[];
  openHour: number;
  closeHour: number;
  timeZone?: string | null;
  selectedId: string | null;
  onSelect: (appt: DisplayAppt) => void;
  now: Date;
  /** One-column layout for the stylist phone app (no 720px floor). */
  compact?: boolean;
  storeClosed?: boolean;
  /** Customer-facing TVs show first names only. */
  nameMode?: "full" | "first";
  /** Reception desk can browse upcoming days loaded by the board poll. */
  scheduleDay?: string;
  todayKey?: string;
  scheduleDayLabel?: string;
  scheduleMinDay?: string;
  scheduleMaxDay?: string;
  onScheduleDayChange?: (day: string) => void;
  onCheckIn?: (payload: { appointmentId: string; targetStylistId: string }) => void;
  onCheckout?: (appt: DisplayAppt) => void;
  /** Hide the empty-day overlay (e.g. while the new-booking panel is open). */
  hideEmptyState?: boolean;
  /** Customer TVs get lounge-friendly copy instead of reception desk actions. */
  audience?: "reception" | "customer";
}) {
  const guestName = (name: string) => (nameMode === "first" ? firstName(name) : name);
  const tz = timeZone || "America/Toronto";
  const showChairs = !compact;
  const showDayNav = Boolean(
    showChairs && scheduleDay && todayKey && scheduleMinDay && scheduleMaxDay && onScheduleDayChange
  );
  const viewingToday = !showDayNav || scheduleDay === todayKey;
  const canPrevDay = showDayNav && scheduleDay! > scheduleMinDay!;
  const canNextDay = showDayNav && scheduleDay! < scheduleMaxDay!;
  const hours = hourMarks(openHour, closeHour);
  const hourPx = compact ? HOUR_PX : 88;
  const spanMin = Math.max(60, (closeHour - openHour) * 60);
  const height = hours.length * hourPx;
  const openMin = openHour * 60;
  const nowMin = clockParts(now.toISOString(), timeZone).minutes;
  const nowTop = ((nowMin - openMin) / spanMin) * height;
  const showNow = viewingToday && nowMin >= openMin && nowMin <= closeHour * 60;
  const emptyAboveNowGap = 56;
  // Today: sit just above the NOW line. Other days: same upper band (~1.75h after open)
  // so the empty state does not drop into the afternoon when the day has no NOW marker.
  const emptyAnchorTop = showNow
    ? Math.max(96, nowTop - emptyAboveNowGap)
    : Math.max(96, hourPx * 1.75);
  const isCustomer = audience === "customer";
  const emptyTitle = isCustomer
    ? storeClosed
      ? "Closed today"
      : "Walk-ins welcome"
    : "No bookings on this day";
  const emptyHint = isCustomer
    ? storeClosed
      ? "We'll see you when we're open again."
      : "No appointments on the floor right now. Check in at reception — our team will seat you shortly."
    : null;
  const columns = stylists.length
    ? stylists
    : [{ id: "none", name: "Chair", bio: null, color: "#c9a87c", photoUrl: "" }];
  const bodyRef = useRef<HTMLDivElement>(null);
  const scrolled = useRef(false);
  const pending = useRef<{
    pointerId: number;
    appt: DisplayAppt;
    stylist: DisplayStylist;
    x: number;
    y: number;
  } | null>(null);
  const dragRef = useRef<ChairDrag | null>(null);
  const suppressClick = useRef(false);
  const [drag, setDrag] = useState<ChairDrag | null>(null);

  function publishDrag(next: ChairDrag | null) {
    dragRef.current = next;
    setDrag(next);
  }

  function endDrag(clientX: number, clientY: number, commit: boolean) {
    const current = dragRef.current;
    pending.current = null;
    publishDrag(null);
    if (!commit || !current || !onCheckIn) return;
    const hit = hitChairDrop(clientX, clientY);
    const targetStylistId = resolveDropTarget(hit, current.stylistId);
    if (targetStylistId) {
      onCheckIn({ appointmentId: current.apptId, targetStylistId });
    }
  }

  function onCardPointerDown(e: React.PointerEvent, appt: DisplayAppt, stylist: DisplayStylist) {
    if (!onCheckIn || !canChairCheckIn(appt.status) || e.button !== 0) return;
    pending.current = { pointerId: e.pointerId, appt, stylist, x: e.clientX, y: e.clientY };
  }

  function onCardPointerMove(e: React.PointerEvent) {
    const start = pending.current;
    if (!start || start.pointerId !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!dragRef.current && dx * dx + dy * dy < 64) return;
    if (!dragRef.current) {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    const hit = hitChairDrop(e.clientX, e.clientY);
    const over = resolveDropTarget(hit, start.stylist.id);
    publishDrag({
      apptId: start.appt.id,
      stylistId: start.stylist.id,
      stylistName: start.stylist.name,
      label: guestName(start.appt.client.name),
      service: start.appt.service.name,
      time: `${formatClock(start.appt.startsAt, timeZone)}–${formatClock(start.appt.endsAt, timeZone)}`,
      x: e.clientX,
      y: e.clientY,
      overStylistId: over,
    });
  }

  function onCardPointerUp(e: React.PointerEvent) {
    if (pending.current?.pointerId !== e.pointerId && !dragRef.current) return;
    const dragged = Boolean(dragRef.current);
    suppressClick.current = dragged;
    endDrag(e.clientX, e.clientY, dragged);
  }

  useEffect(() => {
    scrolled.current = false;
  }, [scheduleDay]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!showNow || !el) return;
    const top = Math.max(0, nowTop - el.clientHeight * 0.35);
    el.scrollTo({ top, behavior: scrolled.current ? "smooth" : "auto" });
    scrolled.current = true;
  }, [showNow, nowMin, nowTop, columns.length, scheduleDay]);

  function scrollToNow() {
    const el = bodyRef.current;
    if (!el || !showNow) return;
    el.scrollTo({ top: Math.max(0, nowTop - el.clientHeight * 0.35), behavior: "smooth" });
  }

  function jumpToday() {
    if (!showDayNav || !todayKey || !onScheduleDayChange) {
      scrollToNow();
      return;
    }
    if (viewingToday) {
      scrollToNow();
      return;
    }
    onScheduleDayChange(todayKey);
  }

  const cols = compact
    ? "3.25rem minmax(0, 1fr)"
    : `4.25rem repeat(${columns.length}, minmax(12rem, 1fr))`;
  const minW = compact ? "min-w-0" : "min-w-[920px]";
  const dayTitle =
    scheduleDayLabel ||
    now.toLocaleDateString("en-CA", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {showChairs && !isCustomer ? (
        <div className="reception-cal-toolbar">
          {showDayNav ? (
            <div className="reception-cal-toolbar__nav">
              <button
                type="button"
                className="reception-cal-toolbar__arrow"
                data-testid="reception-cal-prev"
                aria-label="Previous day"
                disabled={!canPrevDay}
                onClick={() =>
                  onScheduleDayChange!(addCalendarDays(scheduleDay!, -1, tz))
                }
              >
                ←
              </button>
              <h2 className="reception-cal-toolbar__title" data-testid="reception-cal-day">
                {dayTitle}
              </h2>
              <button
                type="button"
                className="reception-cal-toolbar__arrow"
                data-testid="reception-cal-next"
                aria-label="Next day"
                disabled={!canNextDay}
                onClick={() =>
                  onScheduleDayChange!(addCalendarDays(scheduleDay!, 1, tz))
                }
              >
                →
              </button>
            </div>
          ) : (
            <h2 className="reception-cal-toolbar__title">{dayTitle}</h2>
          )}
          <button
            type="button"
            className="reception-cal-toolbar__today"
            data-testid="reception-cal-today"
            onClick={jumpToday}
          >
            Today
          </button>
        </div>
      ) : null}
      <div
        ref={bodyRef}
        data-testid="reception-cal-scroll"
        className={`reception-cal-scroll min-h-0 flex-1 ${showChairs ? "reception-cal-body" : ""}`}
      >
        <div
          className={`relative grid ${minW}`}
          style={{ gridTemplateColumns: cols, gridTemplateRows: "auto auto" }}
        >
          <div className="sticky top-0 z-40 col-start-1 row-start-1 bg-[var(--rx-bg)]" />
          <div className="relative col-start-1 row-start-2" style={{ height }}>
            {hours.map((h, i) => (
              <p
                key={h}
                className="absolute right-2 text-[10px] text-[color:var(--rx-faint)] tabular-nums"
                style={{ top: i * hourPx - 5 }}
              >
                {formatHourLabel(h)}
              </p>
            ))}
            <p
              className="absolute right-2 text-[10px] text-[color:var(--rx-faint)] tabular-nums"
              style={{ top: hours.length * hourPx - 5 }}
            >
              {formatHourLabel(closeHour)}
            </p>
          </div>
          {columns.map((stylist, index) => {
            const items = appointments.filter(
              (a) => a.stylist.id === stylist.id || a.stylist.name === stylist.name
            );
            const wait = stylistWaitInfo(
              items,
              now,
              openHour,
              closeHour,
              timeZone,
              storeClosed
            );
            const visual = stylistChairVisual(wait, stylistCurrentGuest(items, now, timeZone));
            const chairWait = { ...wait, kind: visual.kind };
            const dropTarget = Boolean(
              showChairs && drag && chairAcceptsDrop(visual.kind, stylist.id === drag.stylistId)
            );
            const dropHot = Boolean(dropTarget && drag?.overStylistId === stylist.id);
            const utilPct = showChairs
              ? stylistUtilization(items, openHour, closeHour, timeZone)
              : 0;
            return (
              <div
                key={stylist.id}
                data-stylist-column={stylist.id}
                className="relative grid"
                style={{
                  gridColumn: index + 2,
                  gridRow: "1 / -1",
                  gridTemplateRows: "subgrid",
                }}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 left-0 z-30 w-px bg-[color:var(--rx-line)]"
                />
                {showChairs ? (
                  <div className="sticky top-0 z-40 bg-[var(--rx-bg)] px-1.5 pt-2 pb-3">
                    <div
                      data-testid="stylist-chair-drop"
                      data-chair-drop={stylist.id}
                      data-chair-name={stylist.name}
                      data-chair-kind={visual.kind}
                      className={`reception-stylist-card customer-stylist-chair-drop${dropTarget ? " is-drop-target" : ""}${dropHot ? " is-hot" : ""}`}
                    >
                      {dropHot ? <span className="reception-stylist-card__drop">Drop here ↓</span> : null}
                      <div className="reception-stylist-card__photo-wrap">
                        {showChairs ? <StylistUtilRing pct={utilPct} /> : null}
                        <div
                          className={`customer-stylist-photo-ring h-14 w-14 shrink-0 overflow-hidden rounded-full ring-offset-2 ring-offset-[var(--rx-panel)] ${stylistStatusRingClass(
                            visual.kind
                          )}`}
                          data-testid="stylist-status-ring"
                          data-status-tone={stylistFloorTone(visual.kind)}
                          title={wait.label}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={stylist.photoUrl || "/avatars/stylist-neutral.svg"}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </div>
                      <p className="mt-2 max-w-full truncate text-sm font-semibold text-[color:var(--rx-text)]">
                        {stylist.name}
                      </p>
                      <StylistChairStatus
                        variant="lounge"
                        wait={chairWait}
                        guestName={visual.guestName}
                        dropActive={dropHot}
                        dropTarget={dropTarget && !dropHot}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="sticky top-0 z-40 flex items-center gap-2 bg-[var(--rx-bg)] px-3 py-3">
                    <div className="relative h-10 w-10 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={stylist.photoUrl || "/avatars/stylist-neutral.svg"}
                        alt=""
                        className={`h-10 w-10 rounded-full object-cover ring-offset-2 ring-offset-[var(--rx-bg)] ${stylistStatusRingClass(
                          wait.kind
                        )}`}
                        data-testid="stylist-status-ring"
                        data-status-tone={stylistFloorTone(wait.kind)}
                        title={wait.label}
                      />
                      <span
                        className={`absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full ring-2 ring-[color:var(--rx-nav)] ${stylistStatusDotClass(
                          wait.kind
                        )}`}
                      />
                    </div>
                    <p className="truncate text-sm font-semibold text-[color:var(--rx-text)]">{stylist.name}</p>
                  </div>
                )}
                <div className="relative" style={{ height }}>
                  {hours.map((h, i) => (
                    <div
                      key={h}
                      className="pointer-events-none absolute inset-x-0 border-t border-[color:var(--rx-line)]"
                      style={{ top: i * hourPx }}
                    />
                  ))}
                  {items.map((a) => {
                    const box = timelineCardBox(a, now, openMin, spanMin, height, 72, timeZone);
                    const selected = selectedId === a.id;
                    const checkIn = Boolean(showChairs && onCheckIn && canChairCheckIn(a.status));
                    return (
                      <article
                        key={a.id}
                        data-testid="reception-appt-card"
                        data-appt-status={a.status}
                        data-appt-id={a.id}
                        data-service-kind={serviceKind(a.service.name)}
                        className={`reception-cal-card absolute inset-x-1.5 z-10 overflow-hidden text-left${
                          selected ? " is-selected" : ""
                        }${checkIn ? " customer-appt-card--draggable" : ""}${
                          drag?.apptId === a.id ? " customer-appt-card--dragging" : ""
                        }${a.status === "CHECKED_IN" ? " is-checked-in" : " is-booked"}`}
                        style={{
                          top: box.top,
                          height: box.height,
                          touchAction: drag?.apptId === a.id ? "none" : "pan-x pan-y",
                        }}
                        data-on-chair={box.onChair ? "true" : undefined}
                        title={`${formatClock(a.startsAt, timeZone)} · ${a.service.name}${
                          checkIn ? " · Drag onto a stylist to check in" : ""
                        }`}
                        onPointerDown={checkIn ? (e) => onCardPointerDown(e, a, stylist) : undefined}
                        onPointerMove={checkIn ? onCardPointerMove : undefined}
                        onPointerUp={checkIn ? onCardPointerUp : undefined}
                        onPointerCancel={checkIn ? onCardPointerUp : undefined}
                      >
                        {drag?.apptId === a.id ? <span className="reception-cal-card__ghost" aria-hidden /> : null}
                        <button
                          type="button"
                          className="relative z-10 block h-full w-full px-2.5 py-1.5 text-left"
                          onClick={() => {
                            if (suppressClick.current) {
                              suppressClick.current = false;
                              return;
                            }
                            onSelect(a);
                          }}
                        >
                          <p className="flex items-center gap-1.5 text-sm font-semibold text-[color:var(--rx-text)]">
                            {a.client.photoUrl ? (
                              <img src={a.client.photoUrl} alt="" className="reception-cal-card__avatar is-photo" />
                            ) : (
                              <span className="reception-cal-card__avatar">{initials(a.client.name)}</span>
                            )}
                            <span className="min-w-0 flex-1 truncate">{guestName(a.client.name)}</span>
                            <span
                              className={`reception-cal-card__status is-${a.status.toLowerCase()}`}
                            >
                              {a.status === "CHECKED_IN" ? "Checked in" : statusLabel(a.status)}
                            </span>
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-[color:var(--rx-muted)]">
                            {audience === "customer" ? (
                              <ServiceGlyph kind={serviceKind(a.service.name)} className="reception-cal-card__service-icon" />
                            ) : null}
                            {a.service.name}
                          </p>
                          <p className="mt-0.5 truncate text-[10px] text-[color:var(--rx-faint)]">
                            {formatClock(a.startsAt, timeZone)}–{formatClock(a.endsAt, timeZone)}
                          </p>
                          {a.status === "CHECKED_IN" ? (
                            <ActiveProgressBar progress={seatedServiceProgress(a, now).progress} label={seatedServiceProgress(a, now).remainingLabel} colorVar="--rx-accent" />
                          ) : audience === "customer" ? (
                            <DurationBar startsAt={a.startsAt} endsAt={a.endsAt} />
                          ) : null}
                        </button>
                        {showChairs && onCheckout && a.status === "CHECKED_IN" ? (
                          <button
                            type="button"
                            className="reception-cal-card__pay"
                            data-testid="reception-card-checkout"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              onCheckout(a);
                            }}
                          >
                            Checkout
                          </button>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {showNow ? (
            <div
              className="pointer-events-none relative z-10 col-start-2 col-end-[-1] row-start-2 reception-cal-now"
              style={{ height }}
            >
              <div className="absolute inset-x-0 reception-cal-now__line" style={{ top: nowTop }} />
              <span
                className="absolute left-0 flex items-center gap-1.5 rounded-full bg-[var(--rx-accent)] px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] text-white uppercase reception-cal-now__tag"
                style={{ top: nowTop, transform: "translateY(-50%)" }}
              >
                <span className="reception-cal-now__dot" />
                Now {formatMinutesClock(nowMin)}
              </span>
            </div>
          ) : null}
          {showChairs && appointments.length === 0 && !hideEmptyState ? (
            <div
              className="pointer-events-none relative z-[4] col-start-2 col-end-[-1] row-start-2"
              style={{ height }}
            >
              <div
                className={`reception-cal-empty reception-cal-empty--timeline${isCustomer ? " reception-cal-empty--customer" : ""}`}
                style={{ top: emptyAnchorTop }}
                data-testid={isCustomer ? "customer-schedule-empty" : "reception-schedule-empty"}
              >
                {isCustomer ? (
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M7 18h10M9 14h6M10 10V6.5a2 2 0 0 1 4 0V10"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                    <path
                      d="M6 10h12l-1 8H7L6 10Z"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                    <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                )}
                <p className="reception-cal-empty__title">{emptyTitle}</p>
                <p className="reception-cal-empty__hint">
                  {emptyHint ?? (
                    <>
                      Use <strong>+ New</strong> or <strong>Walk-in</strong> to get started, or pick another date.
                    </>
                  )}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {drag ? (
        <div className="reception-drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>
          <p className="font-semibold">{drag.label}</p>
          {drag.service ? <p className="text-[11px] opacity-80">{drag.service}</p> : null}
          {drag.time ? <p className="text-[10px] opacity-70">{drag.time}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function QuickActionIcon({ kind }: { kind: "checkin" | "reschedule" | "noshow" | "checkout" }) {
  if (kind === "checkin") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 12.2 10.6 15 16 9.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "reschedule") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="4" y="5.5" width="16" height="14" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 4v3.5M16 4v3.5M4 10h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M9 15h3.2M15.2 13.2 17 15l-1.8 1.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "checkout") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="6.5" width="18" height="12" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 10.5h18" stroke="currentColor" strokeWidth="1.6" />
        <path d="M7 15h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "noshow") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="10" cy="8" r="2.4" stroke="currentColor" strokeWidth="1.6" />
        <path d="M5.5 18c.5-2.6 2.4-4 4.5-4s4 1.4 4.5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M16.2 8.2 20 12M20 8.2 16.2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return null;
}

export function ReceptionClientPanel({
  appt,
  onClose,
  onStatus,
  onCheckout,
  onReschedule,
  busyId,
  checkoutBusy,
  checkoutError,
  checkInError,
  chairOccupied,
}: {
  appt: DisplayAppt | null;
  onClose: () => void;
  onStatus: (id: string, status: string, chargedCents?: number, tipCents?: number) => void;
  onCheckout?: (appt: DisplayAppt) => void;
  onReschedule?: (appt: DisplayAppt) => void;
  busyId?: string | null;
  checkoutBusy?: boolean;
  checkoutError?: string;
  checkInError?: string;
  chairOccupied?: boolean;
}) {
  const confirm = useConfirm();
  const booked = appt?.status === "BOOKED";
  const open = appt && ["BOOKED", "CHECKED_IN"].includes(appt.status);

  async function markNoShow() {
    if (!appt) return;
    const ok = await confirm({
      title: "Mark no-show?",
      message: `${appt.client.name} will be marked as a no-show.`,
      confirmLabel: "No-show",
    });
    if (ok) onStatus(appt.id, "NO_SHOW");
  }

  return (
    <aside className="reception-quick" data-testid="reception-client-panel">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="reception-quick__title">Quick Actions</h2>
        <div className="flex items-center gap-2">
          {appt?.status === "CHECKED_IN" ? (
            <span className="reception-quick__live" data-testid="reception-live-badge">
              Live
            </span>
          ) : null}
          {appt ? (
            <button type="button" onClick={onClose} className="text-lg leading-none text-[color:var(--rx-faint)] hover:text-[color:var(--rx-text)]" aria-label="Close">
              ×
            </button>
          ) : null}
        </div>
      </div>

      {appt ? (
        <div className="mb-4 rounded-2xl border border-[color:var(--rx-line)] bg-[var(--rx-input)] px-3 py-2.5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--rx-accent)] text-xs font-bold text-white">
              {initials(appt.client.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[color:var(--rx-text)]">{appt.client.name}</p>
              <p className="truncate text-[11px] text-[color:var(--rx-muted)]">{appt.service.name}</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-[color:var(--rx-faint)]">
            {formatClock(appt.startsAt)} · {appt.stylist.name}
          </p>
        </div>
      ) : (
        <div className="mb-4 rounded-2xl border border-dashed border-[color:var(--rx-line)] bg-[var(--rx-input)] px-3 py-4 text-center">
          <p className="text-sm font-medium text-[color:var(--rx-muted)]">No booking selected</p>
          <p className="mt-1 text-[11px] text-[color:var(--rx-faint)]">
            Select a booking or drag onto an available stylist.
          </p>
        </div>
      )}

      <div className="grid gap-2.5">
        <button
          type="button"
          disabled={!booked || chairOccupied || busyId === appt?.id}
          onClick={() => appt && onStatus(appt.id, "CHECKED_IN")}
          className="reception-quick__btn"
        >
          <span className="reception-quick__icon reception-quick__icon--checkin"><QuickActionIcon kind="checkin" /></span>
          <span>
            <strong>Check-in</strong>
            <span aria-hidden>
              {chairOccupied
                ? "Chair occupied — use an available stylist"
                : "Mark client as arrived"}
            </span>
          </span>
        </button>
        <button
          type="button"
          disabled={!open}
          onClick={() => appt && onReschedule?.(appt)}
          className="reception-quick__btn"
          data-testid="reception-reschedule-open"
        >
          <span className="reception-quick__icon reception-quick__icon--reschedule"><QuickActionIcon kind="reschedule" /></span>
          <span>
            <strong>Reschedule</strong>
            <span aria-hidden>Move booking to new time</span>
          </span>
        </button>
        <button type="button" disabled={!open} onClick={() => void markNoShow()} className="reception-quick__btn">
          <span className="reception-quick__icon reception-quick__icon--noshow"><QuickActionIcon kind="noshow" /></span>
          <span>
            <strong>No-show</strong>
            <span aria-hidden>Mark client as no-show</span>
          </span>
        </button>
        {open ? (
          <button
            type="button"
            disabled={checkoutBusy}
            onClick={() => appt && onCheckout?.(appt)}
            className="reception-quick__btn reception-quick__btn--checkout"
            data-testid="reception-checkout"
          >
            <span className="reception-quick__icon reception-quick__icon--checkout">
              <QuickActionIcon kind="checkout" />
            </span>
            <span>
              <strong>{checkoutBusy ? "Opening…" : "Checkout"}</strong>
              <span aria-hidden>Take payment at the desk</span>
            </span>
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="reception-quick__btn reception-quick__btn--checkout"
            data-testid="reception-checkout"
          >
            <span className="reception-quick__icon reception-quick__icon--checkout">
              <QuickActionIcon kind="checkout" />
            </span>
            <span>
              <strong>Checkout</strong>
              <span aria-hidden>Select a booking on the calendar first</span>
            </span>
          </button>
        )}
        {checkInError ? (
          <p className="text-center text-xs text-[color:var(--rx-accent)]" data-testid="reception-checkin-error">
            {checkInError}
          </p>
        ) : null}
        {checkoutError ? (
          <p className="text-center text-xs text-[color:var(--rx-accent)]" data-testid="reception-checkout-error">
            {checkoutError}
          </p>
        ) : null}
      </div>

      <div className="reception-quick__hints">
        <div className="reception-quick__hints-card">
          <p className="reception-quick__hints-title">Tips</p>
          <div className="reception-quick__hint-row">
            <span className="reception-quick__hint-icon reception-quick__hint-icon--select" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
                <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <circle cx="12" cy="15" r="2.2" fill="currentColor" />
              </svg>
            </span>
            <p className="reception-quick__hint-text">
              <strong>Select a booking</strong> on the calendar, then tap Checkout.
            </p>
          </div>
          <div className="reception-quick__hint-row">
            <span className="reception-quick__hint-icon reception-quick__hint-icon--drag" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="5" y="4" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
                <path d="M8 18h8M12 14v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M9 8h6M9 11h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </span>
            <p className="reception-quick__hint-text">
              <strong>Drag a booking</strong> onto an available stylist to check in.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
