import Link from "next/link";
import { Suspense } from "react";
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

function DashboardFallback() {
  return (
    <div className="animate-pulse space-y-4 py-2" aria-busy="true">
      <div className="h-3 w-24 rounded bg-[color:var(--line)]" />
      <div className="h-10 w-64 max-w-full rounded bg-[color:var(--line)]" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="admin-stat-card h-28 rounded-2xl" />
        ))}
      </div>
      <span className="sr-only">Loading dashboard…</span>
    </div>
  );
}

async function DashboardBody() {
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
    <main className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-champagne uppercase">
            Dashboard
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl leading-tight text-ink">
            {salon.name}
          </h1>
          <p className="mt-1.5 text-sm text-muted">Welcome, {session.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/manager/appointments"
            className="btn-solid rounded-full px-5 py-2.5 text-sm font-semibold"
          >
            Open bookings
          </Link>
        </div>
      </div>

      {pendingLeaveCount > 0 ? (
        <p className="rounded-xl border border-[color:var(--line)] bg-[color:var(--color-cream)] px-4 py-2.5 text-sm font-medium text-ink-soft">
          {pendingLeaveCount} leave request{pendingLeaveCount === 1 ? "" : "s"} awaiting your
          approval — review below.
        </p>
      ) : null}

      <PendingLeavePanel />

      <DashboardStoreEarnings salonId={session.salonId} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/manager/appointments"
          className="admin-stat-card rounded-2xl p-4"
          data-testid="dashboard-todays-bookings"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold tracking-[0.14em] text-champagne uppercase">
              Today&apos;s bookings
            </p>
            <span className="admin-stat-icon" aria-hidden>
              ◉
            </span>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-4xl leading-none text-ink">
            {bookingsTotal}
          </p>
          <ul className="mt-3 space-y-1 text-sm text-muted">
            <li className="flex justify-between gap-2">
              <span>Online</span>
              <span className="font-semibold text-ink">{onlineToday}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span>Walk-in</span>
              <span className="font-semibold text-ink">{walkInToday}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span>Waitlist</span>
              <span className="font-semibold text-champagne">{waitlistWaiting}</span>
            </li>
          </ul>
        </Link>
        {[
          { label: "Active services", value: services, href: "/manager/services", icon: "✂" },
          { label: "Products", value: products, href: "/manager/products", icon: "▣" },
          { label: "Stylists", value: stylists, href: "/manager/stylists", icon: "◇" },
        ].map((card) => (
          <Link key={card.label} href={card.href} className="admin-stat-card rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold tracking-[0.14em] text-champagne uppercase">
                {card.label}
              </p>
              <span className="admin-stat-icon" aria-hidden>
                {card.icon}
              </span>
            </div>
            <p className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-none text-ink">
              {card.value}
            </p>
          </Link>
        ))}
      </div>

      <DashboardFloorToday salonId={session.salonId} />
    </main>
  );
}

export default function AdminHome() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardBody />
    </Suspense>
  );
}
