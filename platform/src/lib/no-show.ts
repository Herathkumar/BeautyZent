import { prisma } from "@/lib/prisma";
import { calendarDateInTz, zonedStartOfDay } from "@/lib/salon-time";

/**
 * BOOKED / CHECKED_IN appointments whose salon-local calendar day has fully
 * passed become NO_SHOW. Same-day open bookings stay open for check-in / done.
 */
export async function applyAutoNoShows(salonId: string, timeZone: string) {
  const todayYmd = calendarDateInTz(timeZone);
  const cutoff = new Date(zonedStartOfDay(todayYmd, timeZone).getTime());

  const result = await prisma.appointment.updateMany({
    where: {
      salonId,
      status: { in: ["BOOKED", "CHECKED_IN"] },
      startsAt: { lt: cutoff },
    },
    data: { status: "NO_SHOW" },
  });

  return result.count;
}
