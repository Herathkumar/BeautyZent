import { addMinutes, isBefore, setHours, setMinutes, startOfDay } from "date-fns";
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
  const open = setMinutes(setHours(dayStart, salon.openHour), 0);
  const close = setMinutes(setHours(dayStart, salon.closeHour), 0);
  const now = new Date();

  const appointments = await prisma.appointment.findMany({
    where: {
      stylistId: opts.stylistId,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      startsAt: { gte: open, lt: close },
    },
    select: { startsAt: true, endsAt: true },
  });

  const slots: string[] = [];
  let cursor = open;
  while (isBefore(addMinutes(cursor, service.durationMin), addMinutes(close, 1))) {
    const end = addMinutes(cursor, service.durationMin);
    const overlaps = appointments.some(
      (a) => cursor < a.endsAt && end > a.startsAt
    );
    if (!overlaps && isBefore(now, cursor)) {
      slots.push(cursor.toISOString());
    }
    cursor = addMinutes(cursor, salon.slotMinutes);
  }
  return slots;
}
