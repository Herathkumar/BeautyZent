"use client";

import type { ReactNode } from "react";
import { mergeBusyMinutes, type DisplayAppt, type DisplayStylist } from "@/lib/display-schedule";
import { formatCad } from "@/lib/money";

function Metric({
  icon,
  value,
  label,
  tone,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  tone?: "pink" | "green" | "blue" | "orange" | "purple";
}) {
  return (
    <article className={`reception-metric reception-metric--${tone || "pink"}`}>
      <span className="reception-metric__icon" aria-hidden>
        {icon}
      </span>
      <div>
        <p className="reception-metric__value">{value}</p>
        <p className="reception-metric__label">{label}</p>
      </div>
    </article>
  );
}

function salonUtilization(
  appointments: DisplayAppt[],
  stylists: DisplayStylist[],
  openHour: number,
  closeHour: number,
  timeZone?: string | null
) {
  const span = Math.max(1, (closeHour - openHour) * 60);
  const chairs = stylists.filter((s) => s.id && s.id !== "none");
  if (!chairs.length) return 0;
  let total = 0;
  for (const stylist of chairs) {
    const items = appointments.filter(
      (a) => a.stylist.id === stylist.id || a.stylist.name === stylist.name
    );
    const busy = mergeBusyMinutes(items, timeZone);
    const mins = busy.reduce((sum, r) => sum + (r.end - r.start), 0);
    total += Math.min(100, Math.round((mins / span) * 100));
  }
  return Math.round(total / chairs.length);
}

export function ReceptionDailyMetrics({
  appointments,
  stylists,
  openHour,
  closeHour,
  timeZone,
  walkInWaiting = 0,
}: {
  appointments: DisplayAppt[];
  stylists: DisplayStylist[];
  openHour: number;
  closeHour: number;
  timeZone?: string | null;
  walkInWaiting?: number;
}) {
  const active = appointments.filter(
    (a) => a.status === "BOOKED" || a.status === "CHECKED_IN"
  );
  const expectedCents = active.reduce((sum, a) => sum + (a.service.priceCents || 0), 0);
  const walkIns =
    active.filter((a) => (a.source || "").toUpperCase() === "WALK_IN").length + walkInWaiting;
  const noShows = appointments.filter((a) => a.status === "NO_SHOW").length;
  const utilization = salonUtilization(appointments, stylists, openHour, closeHour, timeZone);

  return (
    <div className="reception-daily-metrics" data-testid="reception-daily-metrics">
      <Metric
        tone="pink"
        value={String(active.length)}
        label="bookings"
        icon={
          <svg viewBox="0 0 24 24" fill="none">
            <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
            <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        }
      />
      <Metric
        tone="green"
        value={formatCad(expectedCents)}
        label="expected"
        icon={
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 4v16M8 8h6a3 3 0 1 1 0 6H8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        }
      />
      <Metric
        tone="blue"
        value={String(walkIns)}
        label="walk-ins"
        icon={
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M8 20v-2c0-2.2 1.8-4 4-4s4 1.8 4 4v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M16 10l2-1.5M18 12l2 .5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        }
      />
      <Metric
        tone="orange"
        value={String(noShows)}
        label="no-shows"
        icon={
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="10" cy="8" r="2.4" stroke="currentColor" strokeWidth="1.6" />
            <path d="M5.5 18c.5-2.6 2.4-4 4.5-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M16 8.5 20 12M20 8.5 16 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        }
      />
      <Metric
        tone="purple"
        value={`${utilization}%`}
        label="staff utilization"
        icon={
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M4 18V8l8-3 8 3v10" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M8 18v-4h8v4" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        }
      />
    </div>
  );
}

export function stylistUtilization(
  appointments: Pick<DisplayAppt, "startsAt" | "endsAt" | "status">[],
  openHour: number,
  closeHour: number,
  timeZone?: string | null
) {
  const span = Math.max(1, (closeHour - openHour) * 60);
  const busy = mergeBusyMinutes(appointments, timeZone);
  const mins = busy.reduce((sum, r) => sum + (r.end - r.start), 0);
  return Math.min(100, Math.round((mins / span) * 100));
}
