import { calcStylistPay } from "@/lib/pay";
import { prisma } from "@/lib/prisma";
import {
  addCalendarDays,
  calendarDateInTz,
  mondayOfWeekContaining,
  weekDayKeys,
  zonedStartOfDay,
} from "@/lib/salon-time";
import { scheduledMinutesForStylist } from "@/lib/scheduled-hours";

function toDate(d: { getTime: () => number }) {
  return new Date(d.getTime());
}

async function periodCost(opts: {
  salonId: string;
  salonOpenHour: number;
  salonCloseHour: number;
  timeZone: string;
  rangeStart: Date;
  rangeEnd: Date;
}) {
  const [jobs, stylists] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        salonId: opts.salonId,
        status: "COMPLETED",
        excludedFromEarnings: false,
        startsAt: { gte: opts.rangeStart, lt: opts.rangeEnd },
      },
      include: { service: { select: { priceCents: true } } },
    }),
    prisma.stylist.findMany({
      where: { salonId: opts.salonId, active: true },
      select: {
        id: true,
        payType: true,
        hourlyRateCents: true,
        commissionBps: true,
      },
    }),
  ]);

  const charged = jobs.reduce(
    (s, a) => s + (a.chargedCents ?? a.service.priceCents ?? 0),
    0
  );
  const tips = jobs.reduce((s, a) => s + (a.tipCents ?? 0), 0);

  let stylistPay = 0;
  await Promise.all(
    stylists.map(async (s) => {
      const sJobs = jobs.filter((j) => j.stylistId === s.id);
      const sCharged = sJobs.reduce(
        (sum, a) => sum + (a.chargedCents ?? a.service.priceCents ?? 0),
        0
      );
      const sTips = sJobs.reduce((sum, a) => sum + (a.tipCents ?? 0), 0);
      const minutes = await scheduledMinutesForStylist({
        stylistId: s.id,
        salonOpenHour: opts.salonOpenHour,
        salonCloseHour: opts.salonCloseHour,
        timeZone: opts.timeZone,
        rangeStart: opts.rangeStart,
        rangeEnd: opts.rangeEnd,
      });
      const pay = calcStylistPay({
        payType: s.payType,
        hourlyRateCents: s.hourlyRateCents,
        commissionBps: s.commissionBps,
        chargedCentsTotal: sCharged,
        tipCentsTotal: sTips,
        workedMinutes: minutes,
      });
      stylistPay += pay.hourlyPay + pay.commissionPay;
    })
  );

  return {
    chargedCents: charged,
    tipCents: tips,
    revenueCents: charged + tips,
    stylistPayCents: stylistPay,
    profitCents: charged - stylistPay,
    jobCount: jobs.length,
  };
}

/** Compact today + this-week profit snapshot for the manager dashboard. */
export async function getDashboardStoreEarnings(salonId: string) {
  const salon = await prisma.salon.findUniqueOrThrow({ where: { id: salonId } });
  const timeZone = salon.timezone || "America/Toronto";
  const today = calendarDateInTz(timeZone);
  const monday = mondayOfWeekContaining(today, timeZone);
  const days = weekDayKeys(monday, timeZone);
  const weekEndExclusive = addCalendarDays(days[6]!, 1, timeZone);

  const todayStart = toDate(zonedStartOfDay(today, timeZone));
  const tomorrowStart = toDate(
    zonedStartOfDay(addCalendarDays(today, 1, timeZone), timeZone)
  );
  const weekStart = toDate(zonedStartOfDay(monday, timeZone));
  const weekEnd = toDate(zonedStartOfDay(weekEndExclusive, timeZone));

  const base = {
    salonId,
    salonOpenHour: salon.openHour,
    salonCloseHour: salon.closeHour,
    timeZone,
  };

  const [todaySummary, weekSummary] = await Promise.all([
    periodCost({ ...base, rangeStart: todayStart, rangeEnd: tomorrowStart }),
    periodCost({ ...base, rangeStart: weekStart, rangeEnd: weekEnd }),
  ]);

  return { todaySummary, weekSummary };
}
