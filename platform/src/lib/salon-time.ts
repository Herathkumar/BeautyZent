import { TZDate } from "@date-fns/tz";

const DEFAULT_TZ = "America/Toronto";

/** Calendar YYYY-MM-DD in a salon timezone (not UTC). */
export function calendarDateInTz(timeZone = DEFAULT_TZ, at: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** Build a zoned Date for YYYY-MM-DD at hour:minute in the salon timezone. */
export function zonedDateTime(
  ymd: string,
  hour: number,
  minute: number,
  timeZone = DEFAULT_TZ
) {
  const [y, m, d] = ymd.split("-").map((n) => Number(n));
  if (!y || !m || !d) throw new Error(`Invalid date: ${ymd}`);
  return new TZDate(y, m - 1, d, hour, minute, 0, 0, timeZone);
}

export function zonedStartOfDay(ymd: string, timeZone = DEFAULT_TZ) {
  return zonedDateTime(ymd, 0, 0, timeZone);
}

export function dayOfWeekInTz(ymd: string, timeZone = DEFAULT_TZ) {
  return zonedStartOfDay(ymd, timeZone).getDay();
}

export function nowInTz(timeZone = DEFAULT_TZ) {
  return TZDate.tz(timeZone);
}

/** Next N calendar days as YYYY-MM-DD in salon timezone, starting from `fromYmd` or today. */
export function upcomingCalendarDays(
  count = 14,
  timeZone = DEFAULT_TZ,
  fromYmd?: string
) {
  const start = fromYmd || calendarDateInTz(timeZone);
  const [y, m, d] = start.split("-").map(Number);
  const days: string[] = [];
  for (let i = 0; i < count; i++) {
    const dt = new TZDate(y!, m! - 1, d! + i, 12, 0, 0, 0, timeZone);
    days.push(calendarDateInTz(timeZone, dt));
  }
  return days;
}

export function formatDayChipLabel(ymd: string, timeZone = DEFAULT_TZ) {
  const dt = zonedDateTime(ymd, 12, 0, timeZone);
  const today = calendarDateInTz(timeZone);
  const tomorrow = upcomingCalendarDays(2, timeZone, today)[1];
  if (ymd === today) return "Today";
  if (ymd === tomorrow) return "Tomorrow";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(dt);
}

/** Monday (YYYY-MM-DD) of the week containing `ymd` in salon TZ. */
export function mondayOfWeekContaining(ymd: string, timeZone = DEFAULT_TZ) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new TZDate(y!, m! - 1, d!, 12, 0, 0, 0, timeZone);
  const dow = dt.getDay(); // 0 Sun … 6 Sat
  const diff = dow === 0 ? -6 : 1 - dow;
  const mon = new TZDate(y!, m! - 1, d! + diff, 12, 0, 0, 0, timeZone);
  return calendarDateInTz(timeZone, mon);
}

export function addCalendarDays(ymd: string, delta: number, timeZone = DEFAULT_TZ) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new TZDate(y!, m! - 1, d! + delta, 12, 0, 0, 0, timeZone);
  return calendarDateInTz(timeZone, dt);
}

export function weekDayKeys(mondayYmd: string, timeZone = DEFAULT_TZ) {
  return upcomingCalendarDays(7, timeZone, mondayYmd);
}

/** Sunday (YYYY-MM-DD) of the week containing `ymd` in salon TZ. */
export function sundayOfWeekContaining(ymd: string, timeZone = DEFAULT_TZ) {
  const dow = dayOfWeekInTz(ymd, timeZone);
  return addCalendarDays(ymd, -dow, timeZone);
}

/** Seven calendar days starting from a Sunday in salon TZ. */
export function weekDayKeysFromSunday(sundayYmd: string, timeZone = DEFAULT_TZ) {
  return upcomingCalendarDays(7, timeZone, sundayYmd);
}

/** YYYY-MM-01 for the month containing `ymd`. */
export function firstDayOfMonth(ymd: string, timeZone = DEFAULT_TZ) {
  const [y, m] = ymd.split("-").map(Number);
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

/** Number of days in the month containing `ymd`. */
export function daysInCalendarMonth(ymd: string, timeZone = DEFAULT_TZ) {
  const [y, m] = ymd.split("-").map(Number);
  for (let d = 31; d >= 28; d--) {
    const dt = new TZDate(y!, m! - 1, d, 12, 0, 0, 0, timeZone);
    if (dt.getMonth() === m! - 1) return d;
  }
  return 30;
}

/** Month grid cells (Sun-start week); `null` pads leading blanks. */
export function monthGrid(anchorYmd: string, timeZone = DEFAULT_TZ): Array<string | null> {
  const first = firstDayOfMonth(anchorYmd, timeZone);
  const [y, m] = first.split("-").map(Number);
  const lead = dayOfWeekInTz(first, timeZone);
  const count = daysInCalendarMonth(anchorYmd, timeZone);
  const out: Array<string | null> = [];
  for (let i = 0; i < lead; i++) out.push(null);
  for (let d = 1; d <= count; d++) {
    const dt = new TZDate(y!, m! - 1, d, 12, 0, 0, 0, timeZone);
    out.push(calendarDateInTz(timeZone, dt));
  }
  return out;
}

export function addCalendarMonths(ymd: string, delta: number, timeZone = DEFAULT_TZ) {
  const first = firstDayOfMonth(ymd, timeZone);
  const [y, m] = first.split("-").map(Number);
  const dt = new TZDate(y!, m! - 1 + delta, 1, 12, 0, 0, 0, timeZone);
  return calendarDateInTz(timeZone, dt);
}
