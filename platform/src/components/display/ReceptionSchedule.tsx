"use client";

import { useEffect, useRef, useState } from "react";
import { hitChairDrop, resolveDropTarget, type ChairDrag } from "@/components/display/chair-drop";
import { StylistChairStatus, customerWaitToneClass } from "@/components/display/StylistChairStatus";
import {
  canChairCheckIn,
  chairAcceptsDrop,
  clockParts,
  firstName,
  formatClock,
  formatHourLabel,
  hourMarks,
  HOUR_PX,
  initials,
  serviceCardTone,
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

function ServiceGlyph({ name }: { name: string }) {
  const kind = serviceKind(name);
  const cls = "h-3.5 w-3.5 shrink-0 opacity-90";
  if (kind === "color") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 3c2 3.5 6 7 6 11a6 6 0 1 1-12 0c0-4 4-7.5 6-11Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    );
  }
  if (kind === "style") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 7h16M6 12h12M8 17h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="6.5" cy="7" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17.5" cy="7" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.4 8.6 12 14l3.6-5.4M12 14v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
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
  onCheckIn,
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
  onCheckIn?: (payload: { appointmentId: string; targetStylistId: string }) => void;
}) {
  const hours = hourMarks(openHour, closeHour);
  const spanMin = Math.max(60, (closeHour - openHour) * 60);
  const height = hours.length * HOUR_PX;
  const openMin = openHour * 60;
  const nowMin = clockParts(now.toISOString(), timeZone).minutes;
  const nowTop = ((nowMin - openMin) / spanMin) * height;
  const showNow = nowMin >= openMin && nowMin <= closeHour * 60;
  const showChairs = !compact;
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
      label: firstName(start.appt.client.name),
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
    const el = bodyRef.current;
    if (!showNow || !el) return;
    const top = Math.max(0, nowTop - el.clientHeight * 0.35);
    el.scrollTo({ top, behavior: scrolled.current ? "smooth" : "auto" });
    scrolled.current = true;
  }, [showNow, nowMin, nowTop, columns.length]);

  const cols = compact
    ? "3.25rem minmax(0, 1fr)"
    : `3.5rem repeat(${columns.length}, minmax(${showChairs ? "10.75rem" : "9rem"}, 1fr))`;
  const minW = compact ? "min-w-0" : showChairs ? "min-w-[880px]" : "min-w-[720px]";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={bodyRef} className="min-h-0 flex-1 overflow-auto">
        <div
          className={`relative grid ${minW}`}
          style={{ gridTemplateColumns: cols, gridTemplateRows: "auto 1fr" }}
        >
          <div className="sticky top-0 z-20 col-start-1 row-start-1 bg-[var(--rx-bg)]" />
          <div className="relative col-start-1 row-start-2" style={{ height }}>
            {hours.map((h, i) => (
              <p
                key={h}
                className="absolute right-2 text-[10px] text-[color:var(--rx-faint)] tabular-nums"
                style={{ top: i * HOUR_PX - 5 }}
              >
                {formatHourLabel(h)}
              </p>
            ))}
            <p
              className="absolute right-2 text-[10px] text-[color:var(--rx-faint)] tabular-nums"
              style={{ top: hours.length * HOUR_PX - 5 }}
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
                  <div
                    className={`sticky top-0 z-20 bg-[var(--rx-bg)] px-2 pt-3 pb-2 ${customerWaitToneClass(visual.kind)}`}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div
                        className={`customer-stylist-photo-ring h-12 w-12 shrink-0 overflow-hidden rounded-full ring-offset-2 ring-offset-[var(--rx-bg)] ${stylistStatusRingClass(
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
                      <p className="mt-1.5 truncate text-sm font-semibold text-[color:var(--rx-text)]">
                        {stylist.name}
                      </p>
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
                ) : (
                  <div className="sticky top-0 z-20 flex items-center gap-2 bg-[var(--rx-bg)] px-3 py-3">
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
                      style={{ top: i * HOUR_PX }}
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
                        className={`absolute inset-x-1.5 z-20 overflow-hidden rounded-xl px-2.5 py-1.5 text-left shadow-md ${serviceCardTone(
                          a.service.name
                        )} ${selected ? "ring-2 ring-[color:var(--rx-accent)]" : ""}${
                          checkIn ? " customer-appt-card--draggable" : ""
                        }${drag?.apptId === a.id ? " customer-appt-card--dragging" : ""}`}
                        style={{
                          top: box.top,
                          height: box.height,
                          touchAction: checkIn ? "none" : undefined,
                        }}
                        data-on-chair={box.onChair ? "true" : undefined}
                        title={`${formatClock(a.startsAt, timeZone)} · ${a.service.name}${
                          checkIn ? " · Drag onto chair to check in" : ""
                        }`}
                        onPointerDown={checkIn ? (e) => onCardPointerDown(e, a, stylist) : undefined}
                        onPointerMove={checkIn ? onCardPointerMove : undefined}
                        onPointerUp={checkIn ? onCardPointerUp : undefined}
                        onPointerCancel={checkIn ? onCardPointerUp : undefined}
                      >
                        <button
                          type="button"
                          className="block h-full w-full text-left"
                          onClick={() => {
                            if (suppressClick.current) {
                              suppressClick.current = false;
                              return;
                            }
                            onSelect(a);
                          }}
                        >
                          <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                            <ServiceGlyph name={a.service.name} />
                            {a.client.name}
                          </p>
                          <p className="truncate text-[11px] opacity-90">{a.service.name}</p>
                          <span className="mt-1 inline-block rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase">
                            {box.onChair ? "On Chair" : statusLabel(a.status)}
                          </span>
                        </button>
                      </article>
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
              <div className="absolute inset-x-0 h-px bg-[#c45b7a]" style={{ top: nowTop }} />
              <span
                className="absolute right-2 flex items-center gap-1 text-[10px] font-bold tracking-[0.18em] text-[#c45b7a] uppercase"
                style={{ top: nowTop, transform: "translateY(-50%)" }}
              >
                <span className="h-2 w-2 rounded-full bg-[#c45b7a]" />
                Now
              </span>
            </div>
          ) : null}
        </div>
      </div>
      {drag ? (
        <div className="customer-appt-drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>
          {drag.label}
        </div>
      ) : null}
    </div>
  );
}

export function ReceptionClientPanel({
  appt,
  onClose,
  onStatus,
  onCheckout,
  busyId,
  checkoutBusy,
  checkoutError,
}: {
  appt: DisplayAppt | null;
  onClose: () => void;
  onStatus: (id: string, status: string, chargedCents?: number, tipCents?: number) => void;
  onCheckout?: (appt: DisplayAppt) => void;
  busyId?: string | null;
  checkoutBusy?: boolean;
  checkoutError?: string;
}) {
  if (!appt) {
    return (
      <aside
        className="flex h-full min-h-[24rem] flex-col justify-center bg-[var(--rx-panel)] px-6 text-center text-sm text-[color:var(--rx-faint)]"
        data-testid="reception-client-panel"
      >
        Select a booking to see client details.
      </aside>
    );
  }
  const vip = (appt.client.visitCount || 0) >= 8;
  const since = appt.client.createdAt
    ? new Date(appt.client.createdAt).toLocaleDateString("en-CA", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
  const visits = appt.client.recentVisits || [];

  return (
    <aside
      className="flex h-full min-h-[24rem] flex-col bg-[var(--rx-panel)] px-5 py-5"
      data-testid="reception-client-panel"
    >
      <div className="mb-5 flex items-start justify-between">
        <p className="text-sm font-semibold text-[color:var(--rx-text)]">Client Details</p>
        <button type="button" onClick={onClose} className="text-lg leading-none text-[color:var(--rx-faint)] hover:text-[color:var(--rx-text)]" aria-label="Close">
          ×
        </button>
      </div>

      <div className="flex gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#c45b7a] text-base font-bold text-white">
          {initials(appt.client.name)}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-[color:var(--rx-text)]">{appt.client.name}</h3>
            {vip ? (
              <span className="rounded-full bg-[#6b4a9a] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#e9d5ff] uppercase">
                VIP Client
              </span>
            ) : null}
          </div>
          {appt.client.email ? <p className="mt-1 truncate text-xs text-[color:var(--rx-muted)]">{appt.client.email}</p> : null}
          {appt.client.phone ? <p className="truncate text-xs text-[color:var(--rx-muted)]">{appt.client.phone}</p> : null}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-y border-[color:var(--rx-line)] py-4">
        <div>
          <p className="text-[10px] font-semibold tracking-wide text-[color:var(--rx-faint)] uppercase">Client Since</p>
          <p className="mt-1 text-sm text-[color:var(--rx-text-80)]">{since}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-wide text-[color:var(--rx-faint)] uppercase">Total Visits</p>
          <p className="mt-1 text-sm text-[color:var(--rx-text-80)]">{appt.client.visitCount ?? 0}</p>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-1.5 flex items-center justify-between text-[10px] font-semibold tracking-wide text-[color:var(--rx-faint)] uppercase">
          Notes
          <span aria-hidden>✎</span>
        </p>
        <p className="rounded-2xl bg-[var(--rx-input)] p-3 text-sm leading-relaxed text-[color:var(--rx-text-80)]">
          {appt.client.notes || appt.notes || "No notes yet."}
        </p>
      </div>

      <div className="mt-5 min-h-0 flex-1">
        <p className="mb-2 text-[10px] font-semibold tracking-wide text-[color:var(--rx-faint)] uppercase">Recent Visits</p>
        {visits.length === 0 ? (
          <p className="text-sm text-[color:var(--rx-faint)]">No completed visits yet.</p>
        ) : (
          <ul className="space-y-2">
            {visits.map((v, i) => (
              <li key={`${v.date}-${i}`} className="flex items-center justify-between gap-2 text-sm">
                <div>
                  <p className="text-[color:var(--rx-text-80)]">{v.serviceName}</p>
                  <p className="text-[11px] text-[color:var(--rx-faint)]">
                    {new Date(v.date).toLocaleDateString("en-CA", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-300 uppercase">
                  Completed
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 grid gap-2">
        {appt.status === "BOOKED" ? (
          <button
            type="button"
            disabled={busyId === appt.id}
            onClick={() => onStatus(appt.id, "CHECKED_IN")}
            className="rounded-2xl bg-[#c45b7a] py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busyId === appt.id ? "Checking in…" : "Check-in"}
          </button>
        ) : null}
        <a
          href="/manager/appointments"
          className="rounded-2xl border border-[color:var(--rx-line)] py-3 text-center text-sm font-semibold text-[color:var(--rx-text-80)]"
        >
          Reschedule
        </a>
        {["BOOKED", "CHECKED_IN"].includes(appt.status) ? (
          <button
            type="button"
            disabled={checkoutBusy}
            onClick={() => onCheckout?.(appt)}
            className="rounded-2xl bg-[#1f6b5a] py-3 text-sm font-semibold text-white disabled:opacity-60"
            data-testid="reception-checkout"
          >
            {checkoutBusy ? "Opening…" : "Checkout"}
          </button>
        ) : null}
        {checkoutError ? (
          <p className="text-center text-xs text-[#f5a8a8]" data-testid="reception-checkout-error">
            {checkoutError}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
