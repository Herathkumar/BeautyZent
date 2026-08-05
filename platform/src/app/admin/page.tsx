import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  addCalendarDays,
  calendarDateInTz,
  zonedStartOfDay,
} from "@/lib/salon-time";
import { DashboardFloorToday } from "./DashboardFloorToday";
import { DashboardStoreEarnings } from "./DashboardStoreEarnings";
import { PendingLeavePanel } from "./PendingLeavePanel";

function toDate(d: { getTime: () => number }) {
  return new Date(d.getTime());
}

export default async function AdminHome() {
  const session = await getSession();
  if (!session) redirect("/manager/login");
  if (session.role === "STYLIST") redirect("/stylist");

  const salon = await prisma.salon.findUniqueOrThrow({ where: { id: session.salonId } });
  const timeZone = salon.timezone || "America/Toronto";
  const todayYmd = calendarDateInTz(timeZone);
  const todayStart = toDate(zonedStartOfDay(todayYmd, timeZone));
  const tomorrowStart = toDate(
    zonedStartOfDay(addCalendarDays(todayYmd, 1, timeZone), timeZone)
  );

  const [
    bookingsBySource,
    waitlistWaiting,
    services,
    products,
    stylists,
    pendingLeaveCount,
  ] = await Promise.all([
    prisma.appointment.groupBy({
      by: ["source"],
      where: {
        salonId: session.salonId,
        startsAt: { gte: todayStart, lt: tomorrowStart },
        status: { not: "CANCELLED" },
      },
      _count: { _all: true },
    }),
    prisma.walkInWaitlist.count({
      where: { salonId: session.salonId, status: "WAITING" },
    }),
    prisma.service.count({ where: { salonId: session.salonId, active: true } }),
    prisma.product.count({ where: { salonId: session.salonId, active: true } }),
    prisma.stylist.count({ where: { salonId: session.salonId, active: true } }),
    prisma.stylistBlock.count({
      where: {
        status: "PENDING",
        stylist: { salonId: session.salonId },
        endsAt: { gte: new Date() },
      },
    }),
  ]);

  const sourceCount = (source: string) =>
    bookingsBySource.find((r) => r.source === source)?._count._all ?? 0;
  const onlineToday = sourceCount("ONLINE");
  const walkInToday = sourceCount("WALK_IN");
  const bookingsTotal = bookingsBySource.reduce((n, r) => n + r._count._all, 0);

  return (
    <main>
      <p className="text-xs font-semibold tracking-[0.2em] text-[#7d6154] uppercase">
        Dashboard
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[#2b2521]">
        {salon.name}
      </h1>
      <p className="mt-2 text-muted">Welcome, {session.name}</p>

      {pendingLeaveCount > 0 ? (
        <p className="mt-3 rounded-xl border border-[#7d6154]/35 bg-[#f3ebe3] px-4 py-2 text-sm text-[#7d6154]">
          {pendingLeaveCount} leave request{pendingLeaveCount === 1 ? "" : "s"} awaiting your
          approval — review below.
        </p>
      ) : null}

      <PendingLeavePanel />

      <DashboardStoreEarnings salonId={session.salonId} />

      <DashboardFloorToday salonId={session.salonId} />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/manager/appointments"
          className="admin-stat-card rounded-2xl p-5"
          data-testid="dashboard-todays-bookings"
        >
          <p className="text-sm text-[#7d6154]">Today&apos;s bookings</p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#2b2521]">
            {bookingsTotal}
          </p>
          <ul className="mt-3 space-y-1 text-sm text-muted">
            <li className="flex justify-between gap-2">
              <span>Online</span>
              <span className="text-[#2b2521]">{onlineToday}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span>Walk-in</span>
              <span className="text-[#2b2521]">{walkInToday}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span>Waitlist</span>
              <span className="text-[#7d6154]">{waitlistWaiting}</span>
            </li>
          </ul>
        </Link>
        {[
          { label: "Active services", value: services, href: "/manager/services" },
          { label: "Products", value: products, href: "/manager/products" },
          { label: "Stylists", value: stylists, href: "/manager/stylists" },
        ].map((card) => (
          <Link key={card.label} href={card.href} className="admin-stat-card rounded-2xl p-5">
            <p className="text-sm text-[#7d6154]">{card.label}</p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#2b2521]">
              {card.value}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
