import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { centsToDollars } from "@/lib/pay";
import {
  addCalendarDays,
  calendarDateInTz,
  mondayOfWeekContaining,
  weekDayKeys,
  zonedStartOfDay,
} from "@/lib/salon-time";

function toDate(d: { getTime: () => number }) {
  return new Date(d.getTime());
}

export async function DashboardStoreEarnings({ salonId }: { salonId: string }) {
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

  const [todayJobs, weekJobs] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        salonId,
        status: "COMPLETED",
        excludedFromEarnings: false,
        startsAt: { gte: todayStart, lt: tomorrowStart },
      },
      include: { service: { select: { priceCents: true } } },
    }),
    prisma.appointment.findMany({
      where: {
        salonId,
        status: "COMPLETED",
        excludedFromEarnings: false,
        startsAt: { gte: weekStart, lt: weekEnd },
      },
      include: { service: { select: { priceCents: true } } },
    }),
  ]);

  const sum = (jobs: typeof todayJobs) => {
    const charged = jobs.reduce(
      (s, a) => s + (a.chargedCents ?? a.service.priceCents ?? 0),
      0
    );
    const tips = jobs.reduce((s, a) => s + (a.tipCents ?? 0), 0);
    return { charged, tips, total: charged + tips, count: jobs.length };
  };

  const todaySum = sum(todayJobs);
  const weekSum = sum(weekJobs);

  return (
    <Link
      href="/manager/earnings"
      className="admin-stat-card mt-6 block rounded-2xl p-5"
      data-testid="dashboard-store-earnings"
    >
      <p className="text-sm text-[#c9a87c]">Store earnings</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Today</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[#f0c987]">
            ${centsToDollars(todaySum.total)}
          </p>
          <p className="text-xs text-muted">
            {todaySum.count} jobs · tips ${centsToDollars(todaySum.tips)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">This week</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[#f0c987]">
            ${centsToDollars(weekSum.total)}
          </p>
          <p className="text-xs text-muted">
            {weekSum.count} jobs · tips ${centsToDollars(weekSum.tips)}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm text-[#c9a87c]">View all earnings →</p>
    </Link>
  );
}
