import Link from "next/link";
import { redirect } from "next/navigation";
import { endOfDay, startOfDay } from "date-fns";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminHome() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const salon = await prisma.salon.findUniqueOrThrow({ where: { id: session.salonId } });
  const today = new Date();
  const [bookingsToday, services, products, stylists] = await Promise.all([
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
  ]);

  return (
    <main>
      <h1 className="font-[family-name:var(--font-display)] text-4xl">{salon.name}</h1>
      <p className="mt-2 text-muted">Welcome, {session.name}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Today's bookings", value: bookingsToday, href: "/admin/appointments" },
          { label: "Active services", value: services, href: "/admin/services" },
          { label: "Products", value: products, href: "/admin/products" },
          { label: "Stylists", value: stylists, href: "/admin/stylists" },
        ].map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-2xl border border-ink/10 bg-cream p-5 hover:border-ink/30"
          >
            <p className="text-sm text-muted">{card.label}</p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl">{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={`/book/${salon.slug}`}
          className="rounded-full bg-ink px-4 py-2 text-sm text-cream"
        >
          Open client booking
        </Link>
        <Link
          href={`/display/${salon.slug}`}
          className="rounded-full border border-ink px-4 py-2 text-sm"
        >
          Open tablet display
        </Link>
      </div>
    </main>
  );
}
