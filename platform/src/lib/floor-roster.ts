import { prisma } from "@/lib/prisma";
import {
  addCalendarDays,
  calendarDateInTz,
  dayOfWeekInTz,
  zonedDateTime,
  zonedStartOfDay,
} from "@/lib/salon-time";

type Interval = { start: Date; end: Date };

export type FloorRosterEntry = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: "WORKING" | "PARTIAL" | "AWAY" | "OFF";
  summary: string;
  scheduled: { startLabel: string; endLabel: string } | null;
  onFloor: { startLabel: string; endLabel: string }[];
  /** Non-cancelled appointments starting today */
  assignedJobs: number;
  /** Free chair time today (minutes), after leave + bookings */
  availableMinutes: number;
  availableLabel: string;
  absences: {
    id: string;
    reasonLabel: string;
    note: string | null;
    status: string;
    startLabel: string;
    endLabel: string;
    coversFullDay: boolean;
  }[];
};

function overlap(a: Interval, b: Interval): Interval | null {
  const start = a.start > b.start ? a.start : b.start;
  const end = a.end < b.end ? a.end : b.end;
  if (start >= end) return null;
  return { start, end };
}

function subtractBusy(work: Interval, busy: Interval[]): Interval[] {
  let free: Interval[] = [{ ...work }];
  for (const block of busy) {
    const next: Interval[] = [];
    for (const seg of free) {
      const hit = overlap(seg, block);
      if (!hit) {
        next.push(seg);
        continue;
      }
      if (seg.start < hit.start) next.push({ start: seg.start, end: hit.start });
      if (hit.end < seg.end) next.push({ start: hit.end, end: seg.end });
    }
    free = next;
  }
  return free;
}

function formatTime(d: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function reasonLabel(reason: string) {
  switch (reason) {
    case "LEAVE":
      return "Away / vacation";
    case "BREAK":
      return "Break";
    case "BLOCKED":
      return "Blocked";
    default:
      return reason || "Away";
  }
}

function minutesBetween(a: Date, b: Date) {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60_000));
}

function formatAvailableLabel(minutes: number) {
  if (minutes <= 0) return "No open time";
  if (minutes < 60) return `${minutes}m open`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m open` : `${h}h open`;
}

export async function getFloorRoster(opts: {
  salonId: string;
  date?: string;
}) {
  const salon = await prisma.salon.findUniqueOrThrow({
    where: { id: opts.salonId },
  });
  const timeZone = salon.timezone || "America/Toronto";
  const today = calendarDateInTz(timeZone);
  const date = opts.date || today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid date");
  }

  const dayOfWeek = dayOfWeekInTz(date, timeZone);
  const dayStart = zonedStartOfDay(date, timeZone);
  const nextDay = zonedStartOfDay(addCalendarDays(date, 1, timeZone), timeZone);
  const dayStartMs = dayStart.getTime();
  const nextDayMs = nextDay.getTime();

  const [stylists, dayAppointments] = await Promise.all([
    prisma.stylist.findMany({
      where: { salonId: opts.salonId, active: true },
      include: {
        user: { select: { email: true, phone: true } },
        weekHours: true,
        blocks: {
          where: {
            status: { in: ["PENDING", "APPROVED"] },
            startsAt: { lt: new Date(nextDayMs) },
            endsAt: { gt: new Date(dayStartMs) },
          },
          orderBy: { startsAt: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        salonId: opts.salonId,
        startsAt: { gte: new Date(dayStartMs), lt: new Date(nextDayMs) },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
      select: { stylistId: true, startsAt: true, endsAt: true },
    }),
  ]);

  const jobsByStylist = new Map<string, number>();
  const apptBusyByStylist = new Map<string, Interval[]>();
  for (const a of dayAppointments) {
    jobsByStylist.set(a.stylistId, (jobsByStylist.get(a.stylistId) || 0) + 1);
    const list = apptBusyByStylist.get(a.stylistId) || [];
    list.push({ start: a.startsAt, end: a.endsAt });
    apptBusyByStylist.set(a.stylistId, list);
  }

  const weekdayLabel = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(zonedDateTime(date, 12, 0, timeZone));

  const roster: FloorRosterEntry[] = stylists.map((s) => {
    const weekHour = s.weekHours.find((h) => h.dayOfWeek === dayOfWeek);
    const isOff = weekHour?.isOff ?? dayOfWeek === 0;
    const openHour = weekHour?.startHour ?? salon.openHour;
    const openMinute = weekHour?.startMinute ?? 0;
    const closeHour = weekHour?.endHour ?? salon.closeHour;
    const closeMinute = weekHour?.endMinute ?? 0;

    const scheduledStart = zonedDateTime(date, openHour, openMinute, timeZone);
    const scheduledEnd = zonedDateTime(date, closeHour, closeMinute, timeZone);
    const workValid = !isOff && scheduledStart.getTime() < scheduledEnd.getTime();

    const absences = s.blocks.map((b) => {
      const clipped = overlap(
        { start: scheduledStart, end: scheduledEnd },
        { start: b.startsAt, end: b.endsAt }
      );
      const coversFullDay =
        workValid &&
        clipped != null &&
        clipped.start.getTime() <= scheduledStart.getTime() &&
        clipped.end.getTime() >= scheduledEnd.getTime();
      return {
        id: b.id,
        reason: b.reason,
        reasonLabel: reasonLabel(b.reason),
        note: b.note,
        status: b.status,
        startsAt: b.startsAt.toISOString(),
        endsAt: b.endsAt.toISOString(),
        startLabel: formatTime(b.startsAt, timeZone),
        endLabel: formatTime(b.endsAt, timeZone),
        clippedStartLabel: clipped ? formatTime(clipped.start, timeZone) : null,
        clippedEndLabel: clipped ? formatTime(clipped.end, timeZone) : null,
        coversFullDay,
      };
    });

    const fullDayAway = absences.some((a) => a.coversFullDay);

    let status: FloorRosterEntry["status"] = "OFF";
    let summary = "Day off";
    let onFloor: { startLabel: string; endLabel: string }[] = [];
    let availableMinutes = 0;

    const leaveBusy = s.blocks.map((b) => ({ start: b.startsAt, end: b.endsAt }));
    const apptBusy = apptBusyByStylist.get(s.id) || [];
    const assignedJobs = jobsByStylist.get(s.id) || 0;

    if (!workValid) {
      status = "OFF";
      summary = "Day off";
    } else if (fullDayAway) {
      status = "AWAY";
      const away = absences.find((a) => a.coversFullDay)!;
      summary = `${away.reasonLabel}${away.status === "PENDING" ? " (pending)" : ""} — all day`;
    } else {
      const free = subtractBusy(
        { start: scheduledStart, end: scheduledEnd },
        leaveBusy
      );
      onFloor = free.map((seg) => ({
        startLabel: formatTime(seg.start, timeZone),
        endLabel: formatTime(seg.end, timeZone),
      }));
      const openChair = subtractBusy(
        { start: scheduledStart, end: scheduledEnd },
        [...leaveBusy, ...apptBusy]
      );
      availableMinutes = openChair.reduce(
        (n, seg) => n + minutesBetween(seg.start, seg.end),
        0
      );
      if (onFloor.length === 0) {
        status = "AWAY";
        summary = "Away all day";
        availableMinutes = 0;
      } else if (absences.length === 0) {
        status = "WORKING";
        summary = `${formatTime(scheduledStart, timeZone)} – ${formatTime(scheduledEnd, timeZone)}`;
      } else {
        status = "PARTIAL";
        summary = onFloor.map((seg) => `${seg.startLabel} – ${seg.endLabel}`).join(", ");
      }
    }

    return {
      id: s.id,
      name: s.name,
      phone: s.user?.phone?.trim() || null,
      email: s.user?.email?.trim() || null,
      status,
      summary,
      scheduled: workValid
        ? {
            startLabel: formatTime(scheduledStart, timeZone),
            endLabel: formatTime(scheduledEnd, timeZone),
          }
        : null,
      onFloor,
      assignedJobs,
      availableMinutes,
      availableLabel: formatAvailableLabel(availableMinutes),
      absences: absences.map((a) => ({
        id: a.id,
        reasonLabel: a.reasonLabel,
        note: a.note,
        status: a.status,
        startLabel: a.clippedStartLabel || a.startLabel,
        endLabel: a.clippedEndLabel || a.endLabel,
        coversFullDay: a.coversFullDay,
      })),
    };
  });

  const working = roster.filter((r) => r.status === "WORKING" || r.status === "PARTIAL");
  const away = roster.filter((r) => r.status === "AWAY");
  const off = roster.filter((r) => r.status === "OFF");

  return {
    date,
    today,
    weekdayLabel,
    timeZone,
    counts: {
      working: working.length,
      away: away.length,
      off: off.length,
      total: roster.length,
    },
    roster,
    onFloor: working,
    away,
    off,
  };
}
