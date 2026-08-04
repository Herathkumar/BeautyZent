import Link from "next/link";
import { redirect } from "next/navigation";
import { endOfDay, startOfDay } from "date-fns";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PendingLeavePanel } from "./PendingLeavePanel";

export default async function AdminHome() {
  const session = await getSession();
  if (!session) redirect("/manager/login");
  if (session.role === "STYLIST") redirect("/stylist");

  const salon = await prisma.salon.findUniqueOrThrow({ where: { id: session.salonId } });
  const today = new Date();
  const [bookingsToday, services, products, stylists, pendingLeaveCount] = await Promise.all([
    prisma.appointment.count({
      where: {
        salonId: session.salonId,
        startsAt: { gte: startOfDay(today), lte: endOfDay(today) },
        status: { not: "CANCELLED" },
      },
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

  return (
    <main>
      <p className="text-xs font-semibold tracking-[0.2em] text-[#c9a87c] uppercase">
        Dashboard
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[#fffaf6]">
        {salon.name}
      </h1>
      <p className="mt-2 text-muted">Welcome, {session.name}</p>

      {pendingLeaveCount > 0 ? (
        <p className="mt-3 rounded-xl border border-[#f0c987]/35 bg-[#3a2a22] px-4 py-2 text-sm text-[#f0c987]">
          {pendingLeaveCount} leave request{pendingLeaveCount === 1 ? "" : "s"} awaiting your
          approval — review below.
        </p>
      ) : null}

      <PendingLeavePanel />

      <div className="mt-8">
        <Link
          href="/manager/working"
          className="admin-stat-card block rounded-2xl p-5"
          data-testid="dashboard-who-working"
        >
          <p className="text-sm text-[#c9a87c]">Floor today</p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[#fffaf6]">
            Who&apos;s working
          </p>
          <p className="mt-1 text-sm text-muted">
            See schedules, vacations, and breaks by day
          </p>
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Today's bookings", value: bookingsToday, href: "/manager/appointments" },
          { label: "Active services", value: services, href: "/manager/services" },
          { label: "Products", value: products, href: "/manager/products" },
          { label: "Stylists", value: stylists, href: "/manager/stylists" },
        ].map((card) => (
          <Link key={card.label} href={card.href} className="admin-stat-card rounded-2xl p-5">
            <p className="text-sm text-[#c9a87c]">{card.label}</p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#fffaf6]">
              {card.value}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
