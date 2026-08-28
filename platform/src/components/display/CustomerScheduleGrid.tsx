"use client";

import { useEffect, useRef, useState } from "react";
import { hitChairDrop, resolveDropTarget, type ChairDrag } from "@/components/display/chair-drop";
import { StylistChairStatus } from "@/components/display/StylistChairStatus";
import { ZentraLabFooter } from "@/components/ZentraLabFooter";
import { ServiceGlyph } from "./ServiceGlyph";
import {
  canChairCheckIn,
  chairAcceptsDrop,
  clockParts,
  firstName,
  formatClock,
  formatMinutesClock,
  initials,
  loungeTimeWindow,
  seatedServiceProgress,
  serviceKind,
  stylistChairVisual,
  stylistCurrentGuest,
  stylistFloorTone,
  stylistSpecialtyBadges,
  stylistStatusRingClass,
  stylistWaitInfo,
  type DisplayAppt,
  type DisplayStylist,
} from "@/lib/display-schedule";

const BOOKING_SCAN_MS = 6_000;

export function ActiveProgressBar({ progress, label, colorVar = "--cd-accent" }: { progress: number; label: string; colorVar?: string }) {
  const pct = Math.max(0, Math.min(100, progress * 100));
  return (
    <div className="mt-1.5 w-full">
      <div className="mb-1 flex items-end justify-between">
        <span
          className="text-[9px] font-bold uppercase tracking-wider opacity-90"
          style={{ color: `var(${colorVar})` }}
        >
          Progress
        </span>
        <span className="text-[10px] font-bold text-[color:var(--cd-heading)]">{label.replace("~", "").replace(" left", " left")}</span>
      </div>
      <div
        className="h-[4px] w-full overflow-hidden rounded-full"
        style={{ background: `color-mix(in srgb, var(${colorVar}) 20%, transparent)` }}
      >
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${pct}%`, background: `var(${colorVar})` }}
        />
      </div>
    </div>
  );
}

function LoungeBookingSpotlight({
  appointments,
  stylist,
  timeZone,
  now,
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
  now: Date;
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
  const remaining = onChair ? seatedServiceProgress(a, now) : null;

  return (
    <div className={`customer-lounge-spotlight${onChair ? " is-on-chair" : ""}`}>
      <div
        key={a.id}
        data-testid="customer-appt-card"
        data-appt-status={a.status}
        data-appt-id={a.id}
        data-on-chair={onChair ? "true" : undefined}
        data-service-kind={kind}
        className={`customer-lounge-feature${onChair ? " customer-lounge-feature--serving" : ""}${
          checkIn ? " customer-appt-card--draggable" : ""
        }${draggingId === a.id ? " customer-appt-card--dragging" : ""}`}
        style={{ touchAction: checkIn ? "none" : undefined }}
        title={`${formatClock(a.startsAt, timeZone)} · ${a.service.name}${
          checkIn ? " · Drag onto chair to check in" : ""
        }${remaining ? ` · ${remaining.remainingLabel}` : ""}`}
        onPointerDown={checkIn ? (e) => onCardPointerDown(e, a, stylist) : undefined}
        onPointerMove={checkIn ? onCardPointerMove : undefined}
        onPointerUp={checkIn ? onCardPointerUp : undefined}
        onPointerCancel={checkIn ? onCardPointerUp : undefined}
      >
        {onChair && remaining ? (
          <div className="customer-lounge-feature__serving w-full">
            <div className="customer-lounge-feature__serving-copy w-full">
              <p className="customer-lounge-feature__kicker">On Chair</p>
              <div className="customer-lounge-feature__row">
                {a.client.photoUrl ? (
                  <img src={a.client.photoUrl} alt="" className="customer-lounge-feature__avatar is-photo" />
                ) : (
                  <span className="customer-lounge-feature__avatar">{initials(a.client.name)}</span>
                )}
                <ServiceGlyph kind={kind} className="customer-lounge-feature__glyph" />
                <p className="customer-lounge-feature__name">{firstName(a.client.name)}</p>
              </div>
              <p data-testid="customer-appt-service" className="customer-lounge-feature__meta">
                {a.service.name}
              </p>
              <ActiveProgressBar progress={remaining.progress} label={remaining.remainingLabel} />
            </div>
          </div>
        ) : (
          <>
            <p className="customer-lounge-feature__kicker is-empty" aria-hidden>
              &nbsp;
            </p>
            <div className="customer-lounge-feature__row">
              {a.client.photoUrl ? (
                <img src={a.client.photoUrl} alt="" className="customer-lounge-feature__avatar is-photo" />
              ) : (
                <span className="customer-lounge-feature__avatar">{initials(a.client.name)}</span>
              )}
              <ServiceGlyph kind={kind} className="customer-lounge-feature__glyph" />
              <p className="customer-lounge-feature__name">{firstName(a.client.name)}</p>
            </div>
            <p data-testid="customer-appt-service" className="customer-lounge-feature__meta">
              {formatClock(a.startsAt, timeZone)} · {a.service.name}
            </p>
            <DurationBar startsAt={a.startsAt} endsAt={a.endsAt} />
          </>
        )}
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

function DurationBar({ startsAt, endsAt }: { startsAt: string; endsAt: string }) {
  const min = Math.max(0, (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000);
  const pct = Math.min(100, (min / 180) * 100);
  return (
    <div className="mt-1.5 h-[3px] w-[60%] rounded-full bg-[color-mix(in_srgb,var(--cd-accent)_15%,transparent)] overflow-hidden">
      <div className="h-full rounded-full bg-[var(--cd-accent)]" style={{ width: `${pct}%`, opacity: 0.7 }} />
    </div>
  );
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

  const padClass = compactPad ? "px-4 py-4 sm:px-5 sm:py-5" : "px-8 py-5";
  const timeline = (
    <section className="customer-lounge-timeline" aria-label="Salon hours and current time">
      <div className="customer-lounge-ruler">
        {window.marks.map((mark) => {
          const pct = ((mark - window.start) / span) * 100;
          const nearNow = showNow && Math.abs(pct - nowPct) < 10;
          return (
            <span
              key={mark}
              className={`customer-lounge-tick${nearNow ? " is-near-now" : ""}`}
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
              <div className="customer-lounge-badges" data-testid="customer-lounge-badges">
                {stylistSpecialtyBadges(stylist.bio, stylist.name).map((badge) => (
                  <span key={badge} className="customer-lounge-badge">
                    {badge}
                  </span>
                ))}
              </div>
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
                  now={now}
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
