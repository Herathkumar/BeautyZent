import { addMinutes, isBefore } from "date-fns";
import { isE2eFixtureStylist } from "@/lib/display-schedule";
import { prisma } from "@/lib/prisma";
import {
  addCalendarDays,
  dayOfWeekInTz,
  nowInTz,
  zonedDateTime,
  zonedStartOfDay,
} from "@/lib/salon-time";

export type MarketplaceAvailability = {
  earliestAt: string;
  serviceId: string;
  serviceName: string;
  priceCents: number;
};

/**
 * Find the earliest bookable single-service slot for one business on a local
 * calendar day. Queries appointments/blocks in batches so Explore does not run
 * the full booking slot endpoint once per provider.
 */
export async function getMarketplaceAvailability(opts: {
  salonId: string;
  date: string;
  serviceIds?: string[];
}): Promise<MarketplaceAvailability | null> {
  const salon = await prisma.salon.findUnique({
    where: { id: opts.salonId },
    select: {
      timezone: true,
      openHour: true,
      closeHour: true,
      closedDays: true,
      slotMinutes: true,
    },
  });
  if (!salon) return null;

  const timeZone = salon.timezone || "America/Toronto";
  const dayOfWeek = dayOfWeekInTz(opts.date, timeZone);
  const services = await prisma.service.findMany({
    where: {
      salonId: opts.salonId,
      active: true,
      ...(opts.serviceIds?.length ? { id: { in: opts.serviceIds } } : {}),
    },
    orderBy: [{ priceCents: "asc" }, { sortOrder: "asc" }],
    select: {
      id: true,
      name: true,
      durationMin: true,
      priceCents: true,
      stylists: {
        where: { stylist: { active: true, removedAt: null } },
        select: {
          stylist: {
            select: {
              id: true,
              name: true,
              bio: true,
              weekHours: {
                where: { dayOfWeek },
                select: {
                  startHour: true,
                  startMinute: true,
                  endHour: true,
                  endMinute: true,
                  isOff: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const providers = new Map<
    string,
    {
      id: string;
      weekHours: Array<{
        startHour: number;
        startMinute: number;
        endHour: number;
        endMinute: number;
        isOff: boolean;
      }>;
    }
  >();
  for (const service of services) {
    for (const link of service.stylists) {
      if (!isE2eFixtureStylist(link.stylist)) {
        providers.set(link.stylist.id, link.stylist);
      }
    }
  }
  const stylistIds = [...providers.keys()];
  if (stylistIds.length === 0) return null;

  const dayStart = zonedStartOfDay(opts.date, timeZone);
  const dayEnd = zonedStartOfDay(addCalendarDays(opts.date, 1, timeZone), timeZone);
  const [appointments, blocks] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        stylistId: { in: stylistIds },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        startsAt: { lt: dayEnd },
        endsAt: { gt: dayStart },
      },
      select: { stylistId: true, startsAt: true, endsAt: true },
    }),
    prisma.stylistBlock.findMany({
      where: {
        stylistId: { in: stylistIds },
        status: { in: ["PENDING", "APPROVED"] },
        startsAt: { lt: dayEnd },
        endsAt: { gt: dayStart },
      },
      select: { stylistId: true, startsAt: true, endsAt: true },
    }),
  ]);

  const busyByStylist = new Map<string, Array<{ startsAt: Date; endsAt: Date }>>();
  for (const busy of [...appointments, ...blocks]) {
    const list = busyByStylist.get(busy.stylistId) || [];
    list.push({ startsAt: busy.startsAt, endsAt: busy.endsAt });
    busyByStylist.set(busy.stylistId, list);
  }

  const now = nowInTz(timeZone);
  let earliest: MarketplaceAvailability | null = null;

  for (const service of services) {
    for (const link of service.stylists) {
      const stylist = providers.get(link.stylist.id);
      if (!stylist) continue;
      const hours = stylist.weekHours[0];
      if (hours?.isOff || (!hours && salon.closedDays.includes(dayOfWeek))) continue;

      const open = zonedDateTime(
        opts.date,
        hours?.startHour ?? salon.openHour,
        hours?.startMinute ?? 0,
        timeZone
      );
      const close = zonedDateTime(
        opts.date,
        hours?.endHour ?? salon.closeHour,
        hours?.endMinute ?? 0,
        timeZone
      );
      if (!isBefore(open, close)) continue;

      const busy = busyByStylist.get(stylist.id) || [];
      let cursor: Date = open;
      while (isBefore(addMinutes(cursor, service.durationMin), addMinutes(close, 1))) {
        const end = addMinutes(cursor, service.durationMin);
        const overlaps = busy.some(
          (item) => cursor < item.endsAt && end > item.startsAt
        );
        if (!overlaps && isBefore(now, cursor)) {
          if (!earliest || cursor.toISOString() < earliest.earliestAt) {
            earliest = {
              earliestAt: cursor.toISOString(),
              serviceId: service.id,
              serviceName: service.name,
              priceCents: service.priceCents,
            };
          }
          break;
        }
        cursor = addMinutes(cursor, salon.slotMinutes);
      }
    }
  }

  return earliest;
}
