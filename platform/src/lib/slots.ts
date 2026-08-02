import {
  addMinutes,
  isBefore,
  setHours,
  setMinutes,
  startOfDay,
} from "date-fns";
import { prisma } from "./prisma";

export async function getAvailableSlots(opts: {
  salonId: string;
  stylistId: string;
  serviceId: string;
  day: Date;
}) {
  const salon = await prisma.salon.findUniqueOrThrow({ where: { id: opts.salonId } });
  const service = await prisma.service.findFirstOrThrow({
    where: { id: opts.serviceId, salonId: opts.salonId, active: true },
  });

  const dayStart = startOfDay(opts.day);
  const dayOfWeek = dayStart.getDay(); // 0 Sun … 6 Sat

  const weekHour = await prisma.stylistWeekHour.findUnique({
    where: {
      stylistId_dayOfWeek: {
        stylistId: opts.stylistId,
        dayOfWeek,
      },
    },
  });

  // Explicit day off, or no custom hours → use salon hours (unless day off)
  if (weekHour?.isOff) return [];

  const openHour = weekHour?.startHour ?? salon.openHour;
  const openMinute = weekHour?.startMinute ?? 0;
  const closeHour = weekHour?.endHour ?? salon.closeHour;
  const closeMinute = weekHour?.endMinute ?? 0;

  const open = setMinutes(setHours(dayStart, openHour), openMinute);
  const close = setMinutes(setHours(dayStart, closeHour), closeMinute);
  if (!isBefore(open, close)) return [];

  const now = new Date();
  const dayEnd = addMinutes(close, 0);

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
        startsAt: { lt: dayEnd },
        endsAt: { gt: open },
      },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  const busy = [...appointments, ...blocks];

  const slots: string[] = [];
  let cursor = open;
  while (isBefore(addMinutes(cursor, service.durationMin), addMinutes(close, 1))) {
    const end = addMinutes(cursor, service.durationMin);
    const overlaps = busy.some((b) => cursor < b.endsAt && end > b.startsAt);
    if (!overlaps && isBefore(now, cursor)) {
      slots.push(cursor.toISOString());
    }
    cursor = addMinutes(cursor, salon.slotMinutes);
  }
  return slots;
}
