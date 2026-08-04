import { prisma } from "@/lib/prisma";
import {
  addCalendarDays,
  calendarDateInTz,
  dayOfWeekInTz,
  weekDayKeys,
  zonedDateTime,
  zonedStartOfDay,
} from "@/lib/salon-time";

type Interval = { start: Date; end: Date };

type WeekHourRow = {
  dayOfWeek: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  isOff: boolean;
};

type BlockRow = {
  startsAt: Date;
  endsAt: Date;
};

function overlapMs(a: Interval, b: Interval): number {
  const start = Math.max(a.start.getTime(), b.start.getTime());
  const end = Math.min(a.end.getTime(), b.end.getTime());
  return Math.max(0, end - start);
}

function scheduledIntervalForDay(
  ymd: string,
  weekHour: WeekHourRow | undefined,
  salonOpenHour: number,
  salonCloseHour: number,
  timeZone: string
): Interval | null {
  const isOff = weekHour?.isOff ?? dayOfWeekInTz(ymd, timeZone) === 0;
  if (isOff) return null;
  const startHour = weekHour?.startHour ?? salonOpenHour;
  const startMinute = weekHour?.startMinute ?? 0;
  const endHour = weekHour?.endHour ?? salonCloseHour;
  const endMinute = weekHour?.endMinute ?? 0;
  const start = zonedDateTime(ymd, startHour, startMinute, timeZone);
  const end = zonedDateTime(ymd, endHour, endMinute, timeZone);
  if (start.getTime() >= end.getTime()) return null;
  return { start: new Date(start.getTime()), end: new Date(end.getTime()) };
}

/** Paid scheduled minutes for one calendar day = week hours minus APPROVED leave/breaks. */
export function scheduledMinutesForDay(opts: {
  ymd: string;
  weekHours: WeekHourRow[];
  blocks: BlockRow[];
  salonOpenHour: number;
  salonCloseHour: number;
  timeZone: string;
}): number {
  const dow = dayOfWeekInTz(opts.ymd, opts.timeZone);
  const weekHour = opts.weekHours.find((h) => h.dayOfWeek === dow);
  const work = scheduledIntervalForDay(
    opts.ymd,
    weekHour,
    opts.salonOpenHour,
    opts.salonCloseHour,
    opts.timeZone
  );
  if (!work) return 0;

  let busyMs = 0;
  for (const b of opts.blocks) {
    busyMs += overlapMs(work, { start: b.startsAt, end: b.endsAt });
  }
  // Cap busy to work length (overlapping blocks shouldn't go negative)
  const workMs = work.end.getTime() - work.start.getTime();
  return Math.max(0, Math.round((workMs - Math.min(busyMs, workMs)) / 60_000));
}

export function eachYmdInRange(
  rangeStart: Date,
  rangeEndExclusive: Date,
  timeZone: string
): string[] {
  const startYmd = calendarDateInTz(timeZone, rangeStart);
  const endYmd = calendarDateInTz(timeZone, new Date(rangeEndExclusive.getTime() - 1));
  if (startYmd > endYmd) return [];
  const days: string[] = [];
  let cur = startYmd;
  while (cur <= endYmd) {
    days.push(cur);
    cur = addCalendarDays(cur, 1, timeZone);
  }
  return days;
}

/** Sum paid scheduled minutes across a half-open [rangeStart, rangeEnd) window. */
export async function scheduledMinutesForStylist(opts: {
  stylistId: string;
  salonOpenHour: number;
  salonCloseHour: number;
  timeZone: string;
  rangeStart: Date;
  rangeEnd: Date;
}): Promise<number> {
  const [weekHours, blocks] = await Promise.all([
    prisma.stylistWeekHour.findMany({ where: { stylistId: opts.stylistId } }),
    prisma.stylistBlock.findMany({
      where: {
        stylistId: opts.stylistId,
        status: "APPROVED",
        startsAt: { lt: opts.rangeEnd },
        endsAt: { gt: opts.rangeStart },
      },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  const days = eachYmdInRange(opts.rangeStart, opts.rangeEnd, opts.timeZone);
  return days.reduce(
    (sum, ymd) =>
      sum +
      scheduledMinutesForDay({
        ymd,
        weekHours,
        blocks,
        salonOpenHour: opts.salonOpenHour,
        salonCloseHour: opts.salonCloseHour,
        timeZone: opts.timeZone,
      }),
    0
  );
}

/** Per-day scheduled minutes for a Mon–Sun week (keys = YYYY-MM-DD). */
export async function scheduledMinutesByDayForWeek(opts: {
  stylistId: string;
  salonOpenHour: number;
  salonCloseHour: number;
  timeZone: string;
  mondayYmd: string;
}): Promise<Record<string, number>> {
  const days = weekDayKeys(opts.mondayYmd, opts.timeZone);
  const weekEndExclusive = addCalendarDays(days[6]!, 1, opts.timeZone);
  const rangeStart = new Date(zonedStartOfDay(opts.mondayYmd, opts.timeZone).getTime());
  const rangeEnd = new Date(zonedStartOfDay(weekEndExclusive, opts.timeZone).getTime());

  const [weekHours, blocks] = await Promise.all([
    prisma.stylistWeekHour.findMany({ where: { stylistId: opts.stylistId } }),
    prisma.stylistBlock.findMany({
      where: {
        stylistId: opts.stylistId,
        status: "APPROVED",
        startsAt: { lt: rangeEnd },
        endsAt: { gt: rangeStart },
      },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  const out: Record<string, number> = {};
  for (const ymd of days) {
    out[ymd] = scheduledMinutesForDay({
      ymd,
      weekHours,
      blocks,
      salonOpenHour: opts.salonOpenHour,
      salonCloseHour: opts.salonCloseHour,
      timeZone: opts.timeZone,
    });
  }
  return out;
}
