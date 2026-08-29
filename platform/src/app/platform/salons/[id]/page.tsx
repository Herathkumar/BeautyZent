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
    <div className="max-w-2xl space-y-6">
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

      <section className="grid gap-2 rounded-3xl border border-ink/12 bg-white/80 p-5 text-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-cocoa">Portals</h2>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/book/${salon.slug}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-ink/20 px-4 py-2 text-ink-soft hover:border-ink"
          >
            Client booking
          </a>
          <a
            href={`/display/${salon.slug}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-ink/20 px-4 py-2 text-ink-soft hover:border-ink"
          >
            Customer display
          </a>
          <a
            href={`/display/${salon.slug}/reception`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-ink/20 px-4 py-2 text-ink-soft hover:border-ink"
          >
            Reception desk
          </a>
          <a
            href={`/manager/login?salon=${encodeURIComponent(salon.slug)}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-ink/20 px-4 py-2 text-ink-soft hover:border-ink"
          >
            Manager
          </a>
          <a
            href={`/stylist/login?salon=${encodeURIComponent(salon.slug)}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-ink/20 px-4 py-2 text-ink-soft hover:border-ink"
          >
            Stylist app
          </a>
        </div>
        <p className="text-xs text-muted">
          Manager and stylist open this salon&apos;s login. Sign in with an account from this
          salon — a session from another shop will not be reused.
        </p>
      </section>

      <section className="grid gap-2 rounded-3xl border border-ink/12 bg-white/80 p-5 text-sm">
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
