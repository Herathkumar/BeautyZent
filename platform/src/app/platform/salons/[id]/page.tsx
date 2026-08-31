import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPlatformSession } from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";
import { SalonEditor } from "./SalonEditor";

export const dynamic = "force-dynamic";

export default async function SalonDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const session = await getPlatformSession();
  if (!session) redirect("/platform/login");

  const { id } = await params;
  const { created } = await searchParams;

  const salon = await prisma.salon.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      active: true,
      phone: true,
      email: true,
      address: true,
      city: true,
      region: true,
      country: true,
      timezone: true,
      openHour: true,
      closeHour: true,
      closedDays: true,
      slotMinutes: true,
      bookingThemeId: true,
      managerThemeId: true,
      stylistThemeId: true,
      displayViewMode: true,
      displayViewControl: true,
      displayViewRotateSec: true,
      loungeDisplayEnabled: true,
      schedulerDisplayEnabled: true,
      coverUpdatedAt: true,
    },
  });
  if (!salon) notFound();

  const staff = await prisma.user.findMany({
    where: { salonId: id },
    orderBy: [{ role: "asc" }, { email: "asc" }],
    select: { id: true, email: true, name: true, role: true },
  });

  return (
    <div className="w-full space-y-6">
      <div>
        <Link href="/platform" className="text-sm text-cocoa">
          ← All salons
        </Link>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-ink">
          {salon.name}
        </h1>
        <code className="text-xs text-muted">/{salon.slug}</code>
      </div>

      {created ? (
        <p className="rounded-2xl border border-[#3f6b43]/30 bg-[#e7f0e6] px-4 py-3 text-sm text-[#3f6b43]">
          Salon created. Share the manager login and the booking link below.
        </p>
      ) : null}

      <section className="w-full rounded-3xl border border-ink/12 bg-white/80 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-cocoa">Apps</h2>
        <div className="mt-4 grid w-full grid-cols-3 gap-x-2 gap-y-5 sm:grid-cols-3 sm:gap-x-3 lg:grid-cols-6">
          {(
            [
              {
                name: "Client",
                href: `/book/${salon.slug}`,
                icon: "/book-icon-192.png",
                show: true,
              },
              {
                name: "Lounge",
                href: `/display/${salon.slug}/lounge`,
                icon: "/lounge-icon.svg",
                show: salon.loungeDisplayEnabled !== false,
              },
              {
                name: "Scheduler",
                href: `/display/${salon.slug}/scheduler`,
                icon: "/scheduler-icon.svg",
                show: salon.schedulerDisplayEnabled !== false,
              },
              {
                name: "Reception",
                href: `/display/${salon.slug}/reception`,
                icon: "/reception-icon.svg",
                show: true,
              },
              {
                name: "Manager",
                href: `/manager/login?salon=${encodeURIComponent(salon.slug)}`,
                icon: "/manager-icon.svg",
                show: true,
              },
              {
                name: "Stylist",
                href: `/stylist/login?salon=${encodeURIComponent(salon.slug)}`,
                icon: "/stylist-icon.svg",
                show: true,
              },
            ] as const
          )
            .filter((app) => app.show)
            .map((app) => (
            <a
              key={app.name}
              href={app.href}
              target="_blank"
              rel="noreferrer"
              className="group flex min-w-0 flex-col items-center gap-1.5 text-center no-underline"
            >
              <span className="relative block h-[3.85rem] w-[3.85rem] overflow-hidden rounded-[22.37%] bg-[#0a1a3a] shadow-[0_8px_18px_rgba(40,28,18,0.12)] transition duration-150 group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_22px_rgba(40,28,18,0.16)] sm:h-16 sm:w-16">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={app.icon}
                  alt=""
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                />
              </span>
              <span className="max-w-[4.75rem] text-[11px] leading-tight font-medium text-ink-soft sm:text-xs">
                {app.name}
              </span>
            </a>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted">
          Manager and stylist open this salon&apos;s login. Sign in with an account from this
          salon — a session from another shop will not be reused. Lounge and Scheduler are
          separate TVs — enable them under Store displays below.
        </p>
      </section>

      <section className="grid w-full gap-2 rounded-3xl border border-ink/12 bg-white/80 p-5 text-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-cocoa">Logins</h2>
        {staff.length === 0 ? (
          <p className="text-muted">No staff accounts yet.</p>
        ) : (
          <ul className="grid gap-1 text-ink-soft">
            {staff.map((user) => (
              <li key={user.id} className="flex flex-wrap justify-between gap-2">
                <span>{user.email}</span>
                <span className="text-xs uppercase tracking-[0.12em] text-muted">{user.role}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <SalonEditor salon={salon} />
    </div>
  );
}
