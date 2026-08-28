"use client";

import { useEffect, useRef, useState } from "react";
import { hitChairDrop, resolveDropTarget, type ChairDrag } from "@/components/display/chair-drop";
import { StylistChairStatus } from "@/components/display/StylistChairStatus";
import { ZentraLabFooter } from "@/components/ZentraLabFooter";
import {
  canChairCheckIn,
  chairAcceptsDrop,
  clockParts,
  firstName,
  formatClock,
  formatMinutesClock,
  formatWaitMinutes,
  loungeFloorStats,
  loungeStatusLine,
  loungeTimeWindow,
  serviceKind,
  specialtyFromBio,
  stylistChairVisual,
  stylistCurrentGuest,
  stylistFloorTone,
  stylistStatusRingClass,
  stylistWaitInfo,
  type DisplayAppt,
  type DisplayStylist,
} from "@/lib/display-schedule";

function Glyph({ kind, className = "h-3.5 w-3.5" }: { kind: "cut" | "color" | "style"; className?: string }) {
  const common = className;
  if (kind === "color") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 3c2 3.5 6 7 6 11a6 6 0 1 1-12 0c0-4 4-7.5 6-11Z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    );
  }
  if (kind === "style") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 7h16M6 12h12M8 17h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="6.5" cy="7" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17.5" cy="7" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.4 8.6 12 14l3.6-5.4M12 14v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function CustomerLoungeBanner({ text }: { text: string }) {
  return (
    <p className="customer-lounge-banner" data-testid="customer-lounge-banner">
      <ScissorsMark />
      <span>{text}</span>
    </p>
  );
}

function ScissorsMark() {
  return (
    <svg className="h-7 w-7 text-[color:var(--cd-accent)]" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="6" cy="7" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="6" cy="17" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 8.2 20 19M8 15.8 20 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ClockMark() {
  return (
    <svg className="h-8 w-8 text-[color:var(--cd-accent)]" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 8v4.4l3 1.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function PeopleMark() {
  return (
    <svg className="h-8 w-8 text-[color:var(--cd-accent)]" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16" cy="9" r="2.1" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.5 18c.6-2.6 2.6-4 4.5-4s3.9 1.4 4.5 4M13 14.2c1.6.2 3.3 1.3 3.9 3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

const BOOKING_SCAN_MS = 6_000;

function LoungeBookingSpotlight({
  appointments,
  stylist,
  timeZone,
  paused,
  onCheckIn,
  onCardPointerDown,
  onCardPointerMove,
  onCardPointerUp,
  draggingId,
}: {
  appointments: DisplayAppt[];
  stylist: DisplayStylist;
  timeZone?: string | null;
  paused?: boolean;
  onCheckIn?: (payload: { appointmentId: string; targetStylistId: string }) => void;
  onCardPointerDown: (e: React.PointerEvent, appt: DisplayAppt, stylist: DisplayStylist) => void;
  onCardPointerMove: (e: React.PointerEvent) => void;
  onCardPointerUp: (e: React.PointerEvent) => void;
  draggingId?: string | null;
}) {
  const list = [...appointments].sort((a, b) => {
    if (a.status === "CHECKED_IN" && b.status !== "CHECKED_IN") return -1;
    if (b.status === "CHECKED_IN" && a.status !== "CHECKED_IN") return 1;
    return a.startsAt.localeCompare(b.startsAt);
  });
  const ids = list.map((a) => a.id).join(",");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex((i) => (list.length ? i % list.length : 0));
  }, [ids, list.length]);

  useEffect(() => {
    if (list.length < 2 || paused) return;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % list.length);
    }, BOOKING_SCAN_MS);
    return () => window.clearInterval(timer);
  }, [ids, list.length, paused]);

  if (!list.length) return null;
  const a = list[Math.min(index, list.length - 1)];
  const kind = serviceKind(a.service.name);
  const checkIn = Boolean(onCheckIn && canChairCheckIn(a.status));
  const onChair = a.status === "CHECKED_IN";

  return (
    <div className="customer-lounge-spotlight">
      <div
        key={a.id}
        data-testid="customer-appt-card"
        data-appt-status={a.status}
        data-appt-id={a.id}
        data-on-chair={onChair ? "true" : undefined}
        data-service-kind={kind}
        className={`customer-lounge-feature${checkIn ? " customer-appt-card--draggable" : ""}${
          draggingId === a.id ? " customer-appt-card--dragging" : ""
        }`}
        style={{ touchAction: checkIn ? "none" : undefined }}
        title={`${formatClock(a.startsAt, timeZone)} · ${a.service.name}${
          checkIn ? " · Drag onto chair to check in" : ""
        }`}
        onPointerDown={checkIn ? (e) => onCardPointerDown(e, a, stylist) : undefined}
        onPointerMove={checkIn ? onCardPointerMove : undefined}
        onPointerUp={checkIn ? onCardPointerUp : undefined}
        onPointerCancel={checkIn ? onCardPointerUp : undefined}
      >
        {onChair ? <p className="customer-lounge-feature__kicker">On Chair</p> : (
          <p className="customer-lounge-feature__kicker is-empty" aria-hidden>
            &nbsp;
          </p>
        )}
        <div className="customer-lounge-feature__row">
          <Glyph kind={kind} className="customer-lounge-feature__glyph" />
          <p className="customer-lounge-feature__name">{firstName(a.client.name)}</p>
        </div>
        <p data-testid="customer-appt-service" className="customer-lounge-feature__meta">
          {formatClock(a.startsAt, timeZone)} · {a.service.name}
        </p>
      </div>
      <div className="customer-lounge-spotlight__dots" aria-hidden>
        {list.length > 1
          ? list.map((item, i) => (
              <span
                key={item.id}
                className={`customer-lounge-spotlight__dot${i === index ? " is-on" : ""}`}
              />
            ))
          : null}
      </div>
    </div>
  );
}

function joinNames(names: string[]) {
  if (names.length <= 1) return names[0] || "Chair";
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names[0]} +${names.length - 1}`;
}

type OpeningMark = {
  key: string;
  names: string[];
  freeMin: number;
  pct: number;
  lane: number;
};

function loungeOpeningMarks(
  floor: {
    stylist: DisplayStylist;
    wait: { freeMin: number | null };
    visual: { kind: string };
  }[],
  window: { start: number; end: number },
  span: number,
  nowMin: number
): OpeningMark[] {
  const raw: { id: string; name: string; freeMin: number }[] = [];
  for (const { stylist, wait, visual } of floor) {
    if (visual.kind !== "waiting" && visual.kind !== "opens") continue;
    const freeMin = wait.freeMin;
    if (freeMin == null || freeMin <= nowMin) continue;
    if (freeMin < window.start || freeMin > window.end) continue;
    raw.push({ id: stylist.id, name: firstName(stylist.name), freeMin });
  }
  const byMin = new Map<number, { ids: string[]; names: string[] }>();
  for (const row of raw) {
    const g = byMin.get(row.freeMin) || { ids: [], names: [] };
    g.ids.push(row.id);
    g.names.push(row.name);
    byMin.set(row.freeMin, g);
  }
  const marks: OpeningMark[] = [...byMin.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([freeMin, g]) => ({
      key: g.ids.join("-"),
      names: g.names,
      freeMin,
      pct: ((freeMin - window.start) / span) * 100,
      lane: 0,
    }));
  const placed: { pct: number; lane: number }[] = [];
  for (const mark of marks) {
    let lane = 0;
    while (placed.some((p) => p.lane === lane && Math.abs(p.pct - mark.pct) < 16)) lane += 1;
    mark.lane = Math.min(lane, 2);
    placed.push({ pct: mark.pct, lane: mark.lane });
  }
  return marks;
}

export function CustomerScheduleGrid({
  appointments,
  stylists,
  openHour,
  closeHour,
  timeZone,
  now,
  storeClosed,
  compactPad,
  onCheckIn,
}: {
  appointments: DisplayAppt[];
  stylists: DisplayStylist[];
  openHour: number;
  closeHour: number;
  timeZone?: string | null;
  now: Date;
  storeClosed?: boolean;
  compactPad?: boolean;
  onCheckIn?: (payload: { appointmentId: string; targetStylistId: string }) => void;
}) {
  const nowMin = clockParts(now.toISOString(), timeZone).minutes;
  const openMin = openHour * 60;
  const closeMin = closeHour * 60;
  const window = loungeTimeWindow(nowMin, openMin, closeMin);
  const span = Math.max(1, window.end - window.start);
  const nowPct = ((nowMin - window.start) / span) * 100;
  const showNow = nowMin >= window.start && nowMin <= window.end;

  const columns = stylists.length ? stylists : [{ id: "none", name: "Chair", bio: null, color: "#c9a87c", photoUrl: "" }];
  const pending = useRef<{
    pointerId: number;
    appt: DisplayAppt;
    stylist: DisplayStylist;
    x: number;
    y: number;
  } | null>(null);
  const dragRef = useRef<ChairDrag | null>(null);
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
      label: `${firstName(start.appt.client.name)} · ${start.appt.service.name}`,
      x: e.clientX,
      y: e.clientY,
      overStylistId: over,
    });
  }

  function onCardPointerUp(e: React.PointerEvent) {
    if (pending.current?.pointerId !== e.pointerId && !dragRef.current) return;
    endDrag(e.clientX, e.clientY, Boolean(dragRef.current));
  }

  const floor = columns.map((stylist) => {
    const items = appointments.filter(
      (a) => a.stylist.id === stylist.id || a.stylist.name === stylist.name
    );
    const wait = stylistWaitInfo(items, now, openHour, closeHour, timeZone, storeClosed);
    const visual = stylistChairVisual(wait, stylistCurrentGuest(items, now, timeZone));
    return { stylist, items, wait, visual };
  });
  const stats = loungeFloorStats(
    floor.map(({ wait, visual }) => ({
      kind: visual.kind,
      waitMs: visual.kind === "available" ? 0 : wait.waitMs,
    }))
  );
  const openings = loungeOpeningMarks(floor, window, span, nowMin);
  const openingLanes = openings.reduce((max, m) => Math.max(max, m.lane), 0);
  const openingLift = showNow && openings.some((o) => Math.abs(o.pct - nowPct) < 12) ? 1 : 0;

  const padClass = compactPad ? "px-4 py-4 sm:px-5 sm:py-5" : "px-8 py-5";
  const timeline = (
    <section className="customer-lounge-timeline" aria-label="Now and next openings">
      <div
        className="customer-lounge-ruler"
        style={{
          paddingTop: `${1.45 + (openings.length ? (openingLanes + 1 + openingLift) * 1.1 : 0)}rem`,
        }}
      >
        {window.marks.map((mark) => {
          const pct = ((mark - window.start) / span) * 100;
          const nearNow = showNow && Math.abs(pct - nowPct) < 10;
          const nearOpening = openings.some((o) => Math.abs(pct - o.pct) < 10);
          return (
            <span
              key={mark}
              className={`customer-lounge-tick${nearNow || nearOpening ? " is-near-now" : ""}`}
              style={{ left: `${pct}%` }}
            >
              {formatMinutesClock(mark)}
            </span>
          );
        })}
        {showNow ? (
          <span className="customer-lounge-now" style={{ left: `${Math.max(2, Math.min(98, nowPct))}%` }}>
            <span className="customer-lounge-now__label">
              NOW {formatMinutesClock(nowMin)}
            </span>
            <span className="customer-lounge-now__dot" />
          </span>
        ) : null}
        {openings.map((mark) => {
          const left = Math.max(2, Math.min(98, mark.pct));
          const edge = left < 14 ? "is-start" : left > 86 ? "is-end" : "";
          const lift = showNow && Math.abs(mark.pct - nowPct) < 12 ? 1 : 0;
          return (
            <span
              key={mark.key}
              className={`customer-lounge-open ${edge}`}
              style={{ left: `${left}%`, ["--lane" as string]: mark.lane + lift }}
              data-testid="customer-lounge-opening"
              title={`${joinNames(mark.names)} free at ${formatMinutesClock(mark.freeMin)}`}
            >
              <span className="customer-lounge-open__dot" />
              <span className="customer-lounge-open__label">
                <strong>{joinNames(mark.names)}</strong>
                <span> free at {formatMinutesClock(mark.freeMin)}</span>
              </span>
            </span>
          );
        })}
      </div>
    </section>
  );

  return (
    <div className="customer-lounge flex h-full min-h-0 flex-1 flex-col">
      <div className={`flex min-h-0 flex-1 flex-col gap-5 overflow-auto ${padClass}`}>
      <div className="customer-lounge-chairs">
        {floor.map(({ stylist, items, wait, visual }) => {
          const chairWait = { ...wait, kind: visual.kind };
          const dropTarget = Boolean(
            drag && chairAcceptsDrop(visual.kind, stylist.id === drag.stylistId)
          );
          const dropHot = Boolean(dropTarget && drag?.overStylistId === stylist.id);
          const openAppts = items
            .filter((a) => a.status === "BOOKED" || a.status === "CHECKED_IN")
            .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
          return (
            <article
              key={stylist.id}
              data-stylist-column={stylist.id}
              className="customer-lounge-card"
            >
              <div
                className={`customer-stylist-photo-ring customer-lounge-photo h-24 w-24 shrink-0 overflow-hidden rounded-full ring-offset-2 ring-offset-[var(--cd-panel)] ${stylistStatusRingClass(
                  visual.kind
                )}`}
                data-testid="stylist-status-ring"
                data-status-tone={stylistFloorTone(visual.kind)}
                title={wait.label}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={stylist.photoUrl || "/avatars/stylist-neutral.svg"} alt="" className="h-full w-full object-cover" />
              </div>
              <h3 className="customer-lounge-name">{stylist.name}</h3>
              <p className="customer-lounge-specialty">{specialtyFromBio(stylist.bio, stylist.name)}</p>
              {visual.kind === "available" ? (
                <p className="customer-lounge-ready">Ready for clients</p>
              ) : null}
              <div
                data-testid="stylist-chair-drop"
                data-chair-drop={stylist.id}
                data-chair-name={stylist.name}
                data-chair-kind={visual.kind}
                className={`customer-stylist-chair-drop customer-lounge-drop${dropTarget ? " is-drop-target" : ""}${dropHot ? " is-hot" : ""}`}
              >
                <StylistChairStatus
                  variant="lounge"
                  wait={chairWait}
                  guestName={visual.guestName}
                  dropActive={dropHot}
                  dropTarget={dropTarget && !dropHot}
                />
              </div>
              {openAppts.length ? (
                <LoungeBookingSpotlight
                  appointments={openAppts}
                  stylist={stylist}
                  timeZone={timeZone}
                  paused={Boolean(drag)}
                  onCheckIn={onCheckIn}
                  onCardPointerDown={onCardPointerDown}
                  onCardPointerMove={onCardPointerMove}
                  onCardPointerUp={onCardPointerUp}
                  draggingId={drag?.apptId}
                />
              ) : null}
            </article>
          );
        })}
      </div>

      <div className="customer-lounge-stats">
        <article className="customer-lounge-stat">
          <ClockMark />
          <div>
            <p className="customer-lounge-stat__label">Next available in</p>
            <p className="customer-lounge-stat__value" data-testid="customer-next-wait">
              {storeClosed ? "—" : formatWaitMinutes(stats.nextWaitMs)}
            </p>
          </div>
        </article>
        <article className="customer-lounge-stat customer-lounge-stat--banner">
          <CustomerLoungeBanner text={loungeStatusLine(Boolean(storeClosed), stats)} />
        </article>
        <article className="customer-lounge-stat">
          <PeopleMark />
          <div>
            <p className="customer-lounge-stat__label">Average wait time</p>
            <p className="customer-lounge-stat__value" data-testid="customer-avg-wait">
              {storeClosed ? "—" : formatWaitMinutes(stats.avgWaitMs)}
            </p>
          </div>
        </article>
      </div>
      </div>

      <ZentraLabFooter
        compact
        className={`customer-lounge-footer shrink-0 !mt-0 text-[11px] ${compactPad ? "!px-4 !py-1.5 sm:!px-5" : "!px-8 !py-1.5"}`}
        lead={timeline}
      />

      {drag ? (
        <div className="customer-appt-drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>
          {drag.label}
        </div>
      ) : null}
    </div>
  );
}
