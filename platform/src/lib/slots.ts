import { addMinutes, isBefore } from "date-fns";
import { prisma } from "./prisma";
import {
  calendarDateInTz,
  dayOfWeekInTz,
  nowInTz,
  zonedDateTime,
} from "./salon-time";

export async function getAvailableSlots(opts: {
  salonId: string;
  stylistId: string;
  /** Single service (legacy) or multiple — duration is summed. */
  serviceId?: string;
  serviceIds?: string[];
  /** Calendar day YYYY-MM-DD in the salon timezone */
  date: string;
}) {
  const salon = await prisma.salon.findUniqueOrThrow({ where: { id: opts.salonId } });
  const ids = [
    ...new Set(
      (opts.serviceIds?.length ? opts.serviceIds : opts.serviceId ? [opts.serviceId] : []).filter(
        Boolean
      )
    ),
  ];
  if (ids.length === 0) {
    throw new Error("serviceId or serviceIds required");
  }

  // Do not select imageData Bytes — slot checks run often and would stall the server.
  const services = await prisma.service.findMany({
    where: { id: { in: ids }, salonId: opts.salonId, active: true },
    select: { id: true, durationMin: true },
  });
  if (services.length !== ids.length) {
    throw new Error("Invalid service");
  }
  const byId = new Map(services.map((s) => [s.id, s]));
  const durationMin = ids.reduce((sum, id) => sum + (byId.get(id)?.durationMin || 0), 0);

  const timeZone = salon.timezone || "America/Toronto";
  const ymd = opts.date;
  const dayOfWeek = dayOfWeekInTz(ymd, timeZone); // 0 Sun … 6 Sat

  const weekHour = await prisma.stylistWeekHour.findUnique({
    where: {
      stylistId_dayOfWeek: {
        stylistId: opts.stylistId,
        dayOfWeek,
      },
    },
  });

  if (weekHour?.isOff) return [];

  const openHour = weekHour?.startHour ?? salon.openHour;
  const openMinute = weekHour?.startMinute ?? 0;
  const closeHour = weekHour?.endHour ?? salon.closeHour;
  const closeMinute = weekHour?.endMinute ?? 0;

  const open = zonedDateTime(ymd, openHour, openMinute, timeZone);
  const close = zonedDateTime(ymd, closeHour, closeMinute, timeZone);
  if (!isBefore(open, close)) return [];

  const now = nowInTz(timeZone);
  const dayEnd = close;

  const [appointments, blocks] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        stylistId: opts.stylistId,
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        startsAt: { lt: dayEnd },
        endsAt: { gt: open },
      },
      select: { startsAt: true, endsAt: true },
    }),
    prisma.stylistBlock.findMany({
      where: {
        stylistId: opts.stylistId,
        status: { in: ["PENDING", "APPROVED"] },
        startsAt: { lt: dayEnd },
        endsAt: { gt: open },
      },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  const busy = [...appointments, ...blocks];

  const slots: string[] = [];
  let cursor: Date = open;
  while (isBefore(addMinutes(cursor, durationMin), addMinutes(close, 1))) {
    const end = addMinutes(cursor, durationMin);
    const overlaps = busy.some((b) => cursor < b.endsAt && end > b.startsAt);
    // Keep only future starts (salon-local "now")
    if (!overlaps && isBefore(now, cursor)) {
      slots.push(cursor.toISOString());
    }
    cursor = addMinutes(cursor, salon.slotMinutes);
  }
  return slots;
}

/** Today’s YYYY-MM-DD for a salon (server-safe). */
export function salonToday(timeZone?: string | null) {
  return calendarDateInTz(timeZone || "America/Toronto");
}
