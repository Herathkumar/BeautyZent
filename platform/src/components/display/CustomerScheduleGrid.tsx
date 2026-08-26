"use client";

import { useEffect, useRef } from "react";
import {
  clockParts,
  firstName,
  formatClock,
  formatHourLabel,
  hourMarks,
  HOUR_PX,
  serviceCardTone,
  serviceKind,
  specialtyFromBio,
  stylistFloorTone,
  stylistStatusRingClass,
  stylistWaitInfo,
  type DisplayAppt,
  type DisplayStylist,
  type StylistWaitKind,
} from "@/lib/display-schedule";

function waitStatusClass(kind: StylistWaitKind) {
  if (kind === "available") return "customer-stylist-wait--ok";
  if (kind === "waiting") return "customer-stylist-wait--busy";
  if (kind === "opens") return "customer-stylist-wait--soon";
  return "customer-stylist-wait--off";
}

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
}: {
  appointments: DisplayAppt[];
  stylists: DisplayStylist[];
  openHour: number;
  closeHour: number;
  timeZone?: string | null;
  now: Date;
  storeClosed?: boolean;
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

  useEffect(() => {
    const el = bodyRef.current;
    if (!showNow || !el) return;
    const top = Math.max(0, nowTop - el.clientHeight * 0.35);
    el.scrollTo({ top, behavior: scrolled.current ? "smooth" : "auto" });
    scrolled.current = true;
  }, [showNow, nowMin, nowTop, columns.length]);

  const cols = `4.5rem repeat(${columns.length}, minmax(8.5rem, 1fr))`;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-[color:var(--cd-line)] bg-[var(--cd-panel)] shadow-[var(--cd-shadow)]">
      <div ref={bodyRef} className="min-h-0 flex-1 overflow-auto px-4 pb-4 sm:px-6 sm:pb-5">
        <div
          className="relative grid min-w-[640px]"
          style={{ gridTemplateColumns: cols, gridTemplateRows: "auto 1fr" }}
        >
          <div className="sticky top-0 z-20 col-start-1 row-start-1 bg-[var(--cd-panel)] pt-4 sm:pt-5" />
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
            return (
              <div
                key={stylist.id}
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
                <div className="sticky top-0 z-20 bg-[var(--cd-panel)] px-2 pt-4 pb-3 text-center sm:pt-5">
                  <div
                    className={`mx-auto h-16 w-16 overflow-hidden rounded-full ring-offset-2 ring-offset-[var(--cd-panel)] ${stylistStatusRingClass(
                      wait.kind
                    )}`}
                    data-testid="stylist-status-ring"
                    data-status-tone={stylistFloorTone(wait.kind)}
                    title={wait.label}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={stylist.photoUrl || "/avatars/stylist-neutral.svg"} alt="" className="h-full w-full object-cover" />
                  </div>
                  <p className="mt-2 font-[family-name:var(--font-display)] text-lg text-[color:var(--cd-heading)]">{stylist.name}</p>
                  <p className="text-[11px] tracking-wide text-[color:var(--cd-muted)]">{specialtyFromBio(stylist.bio, stylist.name)}</p>
                  <span className="mt-1 inline-block text-[color:var(--cd-accent)]" aria-hidden>
                    ✦
                  </span>
                  <p
                    data-testid="customer-stylist-wait"
                    data-wait-kind={wait.kind}
                    className={`customer-stylist-wait ${waitStatusClass(wait.kind)}`}
                  >
                    {wait.label}
                    {wait.sublabel ? <span className="customer-stylist-wait__time">{wait.sublabel}</span> : null}
                  </p>
                </div>
                <div className="relative" style={{ height }}>
                  {hours.map((h, i) => (
                    <div
                      key={h}
                      className="pointer-events-none absolute inset-x-2 border-t border-dotted border-[color:var(--cd-line-soft)]"
                      style={{ top: i * HOUR_PX }}
                    />
                  ))}
                  {showNow ? (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                      style={{ top: nowTop }}
                    >
                      <div className="h-px flex-1 bg-[var(--cd-accent)]" />
                      {index === columns.length - 1 ? (
                        <span className="ml-2 flex items-center gap-1 text-[10px] font-bold tracking-[0.18em] text-[color:var(--cd-accent)] uppercase">
                          <span className="h-2 w-2 rounded-full bg-[var(--cd-accent)]" />
                          Now
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  {items.map((a) => {
                    const start = clockParts(a.startsAt, timeZone).minutes - openMin;
                    const end = clockParts(a.endsAt, timeZone).minutes - openMin;
                    const top = (start / spanMin) * height;
                    const cardH = Math.max(48, ((end - start) / spanMin) * height - 6);
                    const kind = serviceKind(a.service.name);
                    return (
                      <div
                        key={a.id}
                        data-service-kind={kind}
                        className={`absolute inset-x-2 flex flex-col items-center justify-center rounded-2xl px-2 py-1 text-center shadow-sm ${serviceCardTone(
                          a.service.name
                        )}`}
                        style={{ top, height: cardH }}
                        title={`${formatClock(a.startsAt, timeZone)} · ${a.service.name}`}
                      >
                        <Glyph kind={kind} />
                        <p className="mt-0.5 text-sm font-medium">{firstName(a.client.name)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

        </div>
      </div>
    </div>
  );
}
