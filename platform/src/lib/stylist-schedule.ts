import { addMinutes, isBefore, isAfter } from "date-fns";
import { prisma } from "./prisma";
import {
  calendarDateInTz,
  dayOfWeekInTz,
  nowInTz,
  zonedDateTime,
} from "./salon-time";

export type ScheduleSegmentKind = "open" | "busy" | "block";

export type ScheduleSegment = {
  kind: ScheduleSegmentKind;
  startsAt: string;
  endsAt: string;
};

export type StylistDaySchedule = {
  stylistId: string;
  stylistName: string;
  date: string;
  timezone: string;
  isOff: boolean;
  working: { startsAt: string; endsAt: string } | null;
  segments: ScheduleSegment[];
  /** First free minute at/after salon-local now, within working hours. */
  nextFreeAt: string | null;
  status: "off" | "available" | "busy" | "done";
};

type Interval = { startsAt: Date; endsAt: Date; kind: "busy" | "block" };

function mergeIntervals(items: Interval[]): Interval[] {
  if (items.length === 0) return [];
  const sorted = [...items].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const out: Interval[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const last = out[out.length - 1];
    if (cur.startsAt.getTime() <= last.endsAt.getTime()) {
      if (cur.endsAt > last.endsAt) last.endsAt = cur.endsAt;
      if (cur.kind === "block" || last.kind === "block") last.kind = "block";
      else last.kind = "busy";
    } else {
      out.push({ ...cur });
    }
  }
  return out;
}

/**
 * Public-safe day board for one stylist: working hours + anonymized busy/open
 * segments (no client names, services, or notes).
 */
export async function getStylistDaySchedule(opts: {
  salonId: string;
  stylistId: string;
  /** YYYY-MM-DD in salon timezone; defaults to today. */
  date?: string;
}): Promise<StylistDaySchedule | null> {
  const salon = await prisma.salon.findUnique({ where: { id: opts.salonId } });
  if (!salon) return null;

  const stylist = await prisma.stylist.findFirst({
    where: {
      id: opts.stylistId,
      salonId: opts.salonId,
      active: true,
      removedAt: null,
    },
    select: { id: true, name: true },
  });
  if (!stylist) return null;

  const timeZone = salon.timezone || "America/Toronto";
  const date = opts.date || calendarDateInTz(timeZone);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const dayOfWeek = dayOfWeekInTz(date, timeZone);
  const weekHour = await prisma.stylistWeekHour.findUnique({
    where: {
      stylistId_dayOfWeek: {
        stylistId: stylist.id,
        dayOfWeek,
      },
    },
  });

  if (weekHour?.isOff) {
    return {
      stylistId: stylist.id,
      stylistName: stylist.name,
      date,
      timezone: timeZone,
      isOff: true,
      working: null,
      segments: [],
      nextFreeAt: null,
      status: "off",
    };
  }

  const openHour = weekHour?.startHour ?? salon.openHour;
  const openMinute = weekHour?.startMinute ?? 0;
  const closeHour = weekHour?.endHour ?? salon.closeHour;
  const closeMinute = weekHour?.endMinute ?? 0;
  const open = zonedDateTime(date, openHour, openMinute, timeZone);
  const close = zonedDateTime(date, closeHour, closeMinute, timeZone);
  if (!isBefore(open, close)) {
    return {
      stylistId: stylist.id,
      stylistName: stylist.name,
      date,
      timezone: timeZone,
      isOff: true,
      working: null,
      segments: [],
      nextFreeAt: null,
      status: "off",
    };
  }

  const [appointments, blocks] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        stylistId: stylist.id,
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        startsAt: { lt: close },
        endsAt: { gt: open },
      },
      select: { startsAt: true, endsAt: true },
    }),
    prisma.stylistBlock.findMany({
      where: {
        stylistId: stylist.id,
        status: { in: ["PENDING", "APPROVED"] },
        startsAt: { lt: close },
        endsAt: { gt: open },
      },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  const busyRaw: Interval[] = [
    ...appointments.map((a) => ({
      startsAt: a.startsAt < open ? open : a.startsAt,
      endsAt: a.endsAt > close ? close : a.endsAt,
      kind: "busy" as const,
    })),
    ...blocks.map((b) => ({
      startsAt: b.startsAt < open ? open : b.startsAt,
      endsAt: b.endsAt > close ? close : b.endsAt,
      kind: "block" as const,
    })),
  ].filter((i) => isBefore(i.startsAt, i.endsAt));

  const merged = mergeIntervals(busyRaw);
  const segments: ScheduleSegment[] = [];
  let cursor = open;
  for (const busy of merged) {
    if (isBefore(cursor, busy.startsAt)) {
      segments.push({
        kind: "open",
        startsAt: cursor.toISOString(),
        endsAt: busy.startsAt.toISOString(),
      });
    }
    segments.push({
      kind: busy.kind,
      startsAt: busy.startsAt.toISOString(),
      endsAt: busy.endsAt.toISOString(),
    });
    cursor = busy.endsAt > cursor ? busy.endsAt : cursor;
  }
  if (isBefore(cursor, close)) {
    segments.push({
      kind: "open",
      startsAt: cursor.toISOString(),
      endsAt: close.toISOString(),
    });
  }

  const now = nowInTz(timeZone);
  let nextFreeAt: string | null = null;
  for (const seg of segments) {
    if (seg.kind !== "open") continue;
    const start = new Date(seg.startsAt);
    const end = new Date(seg.endsAt);
    if (!isBefore(now, end)) continue;
    const freeFrom = isAfter(now, start) ? now : start;
    // Need at least one slot step of free time to call it useful.
    if (isBefore(addMinutes(freeFrom, salon.slotMinutes), addMinutes(end, 1))) {
      nextFreeAt = freeFrom.toISOString();
      break;
    }
  }

  let status: StylistDaySchedule["status"] = "available";
  if (!isBefore(now, close) || !nextFreeAt) {
    status = isBefore(now, open) ? "available" : "done";
  } else {
    const inBusy = merged.some((b) => !isBefore(now, b.startsAt) && isBefore(now, b.endsAt));
    status = inBusy ? "busy" : "available";
  }
  if (isBefore(now, open) && nextFreeAt) status = "available";

  return {
    stylistId: stylist.id,
    stylistName: stylist.name,
    date,
    timezone: timeZone,
    isOff: false,
    working: { startsAt: open.toISOString(), endsAt: close.toISOString() },
    segments,
    nextFreeAt,
    status,
  };
}
