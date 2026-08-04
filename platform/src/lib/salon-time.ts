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
