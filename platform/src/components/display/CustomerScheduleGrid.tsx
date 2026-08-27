"use client";

import { useEffect, useRef, useState } from "react";
import { hitChairDrop, resolveDropTarget, type ChairDrag } from "@/components/display/chair-drop";
import { StylistChairStatus, StylistNeonArrow, customerWaitToneClass } from "@/components/display/StylistChairStatus";
import {
  canChairCheckIn,
  chairAcceptsDrop,
  clockParts,
  firstName,
  formatClock,
  formatHourLabel,
  hourMarks,
  HOUR_PX,
  serviceCardTone,
  serviceKind,
  specialtyFromBio,
  stylistChairVisual,
  stylistCurrentGuest,
  stylistFloorTone,
  stylistStatusRingClass,
  stylistWaitInfo,
  timelineCardBox,
  type DisplayAppt,
  type DisplayStylist,
} from "@/lib/display-schedule";

function Glyph({ kind }: { kind: "cut" | "color" | "style" }) {
  const common = "h-4 w-4";
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

export function CustomerScheduleGrid({
  appointments,
  stylists,
  openHour,
  closeHour,
  timeZone,
  now,
  storeClosed,
  onCheckIn,
}: {
  appointments: DisplayAppt[];
  stylists: DisplayStylist[];
  openHour: number;
  closeHour: number;
  timeZone?: string | null;
  now: Date;
  storeClosed?: boolean;
  onCheckIn?: (payload: { appointmentId: string; targetStylistId: string }) => void;
}) {
  const hours = hourMarks(openHour, closeHour);
  const spanMin = (closeHour - openHour) * 60;
  const height = hours.length * HOUR_PX;
  const nowMin = clockParts(now.toISOString(), timeZone).minutes;
  const openMin = openHour * 60;
  const nowTop = ((nowMin - openMin) / spanMin) * height;
  const showNow = nowMin >= openMin && nowMin <= closeHour * 60;

  const columns = stylists.length ? stylists : [{ id: "none", name: "Chair", bio: null, color: "#c9a87c", photoUrl: "" }];
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
  const [drag, setDrag] = useState<ChairDrag | null>(null);

  function publishDrag(next: ChairDrag | null) {
    dragRef.current = next;
    setDrag(next);
  }

  useEffect(() => {
    const el = bodyRef.current;
    if (!showNow || !el) return;
    const top = Math.max(0, nowTop - el.clientHeight * 0.35);
    el.scrollTo({ top, behavior: scrolled.current ? "smooth" : "auto" });
    scrolled.current = true;
  }, [showNow, nowMin, nowTop, columns.length]);

  const cols = `4.5rem repeat(${columns.length}, minmax(12.5rem, 1fr))`;

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
      label: firstName(start.appt.client.name),
      x: e.clientX,
      y: e.clientY,
      overStylistId: over,
    });
  }

  function onCardPointerUp(e: React.PointerEvent) {
    if (pending.current?.pointerId !== e.pointerId && !dragRef.current) return;
    endDrag(e.clientX, e.clientY, Boolean(dragRef.current));
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-[color:var(--cd-line)] bg-[var(--cd-panel)] shadow-[var(--cd-shadow)]">
      <div ref={bodyRef} className="min-h-0 flex-1 overflow-auto px-4 pb-4 sm:px-6 sm:pb-5">
        <div
          className="relative grid min-w-[640px]"
          style={{ gridTemplateColumns: cols, gridTemplateRows: "auto 1fr" }}
        >
          <div className="sticky top-0 z-40 col-start-1 row-start-1 bg-[var(--cd-panel)] pt-4 sm:pt-5" />
          <div className="relative col-start-1 row-start-2" style={{ height }}>
            {hours.map((h, i) => (
              <p
                key={h}
                className="absolute right-2 text-[11px] font-medium tracking-wide text-[color:var(--cd-muted)] tabular-nums"
                style={{ top: i * HOUR_PX - 6 }}
              >
                {formatHourLabel(h)}
              </p>
            ))}
            <p
              className="absolute right-2 text-[11px] font-medium tracking-wide text-[color:var(--cd-muted)] tabular-nums"
              style={{ top: hours.length * HOUR_PX - 6 }}
            >
              {formatHourLabel(closeHour)}
            </p>
          </div>

          {columns.map((stylist, index) => {
            const items = appointments.filter(
              (a) => a.stylist.id === stylist.id || a.stylist.name === stylist.name
            );
            const wait = stylistWaitInfo(items, now, openHour, closeHour, timeZone, storeClosed);
            const visual = stylistChairVisual(wait, stylistCurrentGuest(items, now, timeZone));
            const chairWait = { ...wait, kind: visual.kind };
            const dropTarget = Boolean(
              drag && chairAcceptsDrop(visual.kind, stylist.id === drag.stylistId)
            );
            const dropHot = Boolean(dropTarget && drag?.overStylistId === stylist.id);
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
                  className="pointer-events-none absolute inset-y-0 left-0 z-30 w-px bg-[color:var(--cd-line)]"
                />
                <div className={`sticky top-0 z-40 bg-[var(--cd-panel)] px-2 pt-4 pb-3 sm:pt-5 ${customerWaitToneClass(visual.kind)}`}>
                  <div className="customer-stylist-head">
                    <div className="flex min-w-0 flex-col items-center text-center">
                      <div
                        className={`customer-stylist-photo-ring h-16 w-16 shrink-0 overflow-hidden rounded-full ring-offset-2 ring-offset-[var(--cd-panel)] ${stylistStatusRingClass(
                          visual.kind
                        )}`}
                        data-testid="stylist-status-ring"
                        data-status-tone={stylistFloorTone(visual.kind)}
                        title={wait.label}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={stylist.photoUrl || "/avatars/stylist-neutral.svg"} alt="" className="h-full w-full object-cover" />
                      </div>
                      <p className="mt-2 font-[family-name:var(--font-display)] text-lg text-[color:var(--cd-heading)]">{stylist.name}</p>
                      <p className="text-[11px] tracking-wide text-[color:var(--cd-muted)]">{specialtyFromBio(stylist.bio, stylist.name)}</p>
                      <span className="customer-stylist-head__rule" aria-hidden />
                    </div>
                    <StylistNeonArrow />
                    <div
                      data-testid="stylist-chair-drop"
                      data-chair-drop={stylist.id}
                      data-chair-name={stylist.name}
                      data-chair-kind={visual.kind}
                      className={`customer-stylist-chair-drop${dropTarget ? " is-drop-target" : ""}${dropHot ? " is-hot" : ""}`}
                    >
                      <StylistChairStatus
                        wait={chairWait}
                        guestName={visual.guestName}
                        dropActive={dropHot}
                        dropTarget={dropTarget && !dropHot}
                      />
                    </div>
                  </div>
                </div>
                <div className="relative overflow-hidden" style={{ height }}>
                  {hours.map((h, i) => (
                    <div
                      key={h}
                      className="pointer-events-none absolute inset-x-2 border-t border-dotted border-[color:var(--cd-line-soft)]"
                      style={{ top: i * HOUR_PX }}
                    />
                  ))}
                  {items.map((a) => {
                    const box = timelineCardBox(a, now, openMin, spanMin, height, 48, timeZone);
                    const kind = serviceKind(a.service.name);
                    const checkIn = Boolean(onCheckIn && canChairCheckIn(a.status));
                    return (
                      <div
                        key={a.id}
                        data-testid="customer-appt-card"
                        data-appt-status={a.status}
                        data-appt-id={a.id}
                        data-on-chair={box.onChair ? "true" : undefined}
                        data-service-kind={kind}
                        className={`absolute inset-x-2 z-10 flex flex-col items-center justify-center rounded-2xl px-2 py-1 text-center shadow-sm ${serviceCardTone(
                          a.service.name
                        )}${checkIn ? " customer-appt-card--draggable" : ""}${drag?.apptId === a.id ? " customer-appt-card--dragging" : ""}`}
                        style={{ top: box.top, height: box.height, touchAction: checkIn ? "none" : undefined }}
                        title={`${formatClock(a.startsAt, timeZone)} · ${a.service.name}${checkIn ? " · Drag onto chair to check in" : ""}`}
                        onPointerDown={checkIn ? (e) => onCardPointerDown(e, a, stylist) : undefined}
                        onPointerMove={checkIn ? onCardPointerMove : undefined}
                        onPointerUp={checkIn ? onCardPointerUp : undefined}
                        onPointerCancel={checkIn ? onCardPointerUp : undefined}
                      >
                        <Glyph kind={kind} />
                        {box.onChair ? (
                          <>
                            <p className="mt-0.5 text-[10px] font-bold tracking-[0.14em] uppercase">On Chair</p>
                            <p className="text-sm font-medium">{firstName(a.client.name)}</p>
                          </>
                        ) : (
                          <p className="mt-0.5 text-sm font-medium">{firstName(a.client.name)}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {showNow ? (
            <div
              className="pointer-events-none relative z-10 col-start-2 col-end-[-1] row-start-2"
              style={{ height }}
            >
              <div
                className="absolute inset-x-0 h-px bg-[var(--cd-accent)]"
                style={{ top: nowTop }}
              />
              <span
                className="absolute right-2 flex items-center gap-1 text-[10px] font-bold tracking-[0.18em] text-[color:var(--cd-accent)] uppercase"
                style={{ top: nowTop, transform: "translateY(-50%)" }}
              >
                <span className="h-2 w-2 rounded-full bg-[var(--cd-accent)]" />
                Now
              </span>
            </div>
          ) : null}

        </div>
      </div>
      {drag ? (
        <div
          className="customer-appt-drag-ghost"
          style={{ left: drag.x, top: drag.y }}
          aria-hidden
        >
          {drag.label}
        </div>
      ) : null}
    </div>
  );
}
