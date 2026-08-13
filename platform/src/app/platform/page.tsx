import Link from "next/link";
import { redirect } from "next/navigation";
import { getPlatformSession } from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_BOOKING_THEME_ID,
  DEFAULT_MANAGER_THEME_ID,
  DEFAULT_STYLIST_THEME_ID,
  getSalonTheme,
} from "@/lib/salon-themes";

export const dynamic = "force-dynamic";

export default async function PlatformHomePage() {
  const session = await getPlatformSession();
  if (!session) redirect("/platform/login");

  const salons = await prisma.salon.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      active: true,
      timezone: true,
      openHour: true,
      closeHour: true,
      bookingThemeId: true,
      managerThemeId: true,
      stylistThemeId: true,
      _count: { select: { stylists: true, services: true, appointments: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-ink">Salons</h1>
          <p className="mt-1 text-sm text-muted">
            {salons.length} tenant{salons.length === 1 ? "" : "s"} on this database.
          </p>
        </div>
        <Link href="/platform/salons/new" className="btn-solid rounded-full px-5 py-3 font-medium">
          New salon
        </Link>
      </div>

      {salons.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-ink/20 bg-white/60 p-6 text-sm text-muted">
          No salons yet. Create the first one to get a manager login and booking page.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {salons.map((salon) => (
          <article
            key={salon.id}
            className="grid gap-3 rounded-3xl border border-ink/12 bg-white/80 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="grid gap-1">
                <h2 className="font-[family-name:var(--font-display)] text-xl leading-tight text-ink">
                  {salon.name}
                </h2>
                <code className="text-xs text-muted">/{salon.slug}</code>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] ${
                  salon.active
                    ? "bg-[#e7f0e6] text-[#3f6b43]"
                    : "bg-[#f2e6e2] text-[#8a4a37]"
                }`}
              >
                {salon.active ? "Active" : "Paused"}
              </span>
            </div>

            <p className="text-sm text-muted">
              {salon._count.stylists} stylists · {salon._count.services} services ·{" "}
              {salon._count.appointments} bookings
            </p>
            <p className="text-xs text-muted">
              {salon.timezone} · {salon.openHour}:00–{salon.closeHour}:00
            </p>

            <ul className="flex flex-wrap gap-1.5">
              {(
                [
                  ["Booking", salon.bookingThemeId, DEFAULT_BOOKING_THEME_ID],
                  ["Manager", salon.managerThemeId, DEFAULT_MANAGER_THEME_ID],
                  ["Stylist", salon.stylistThemeId, DEFAULT_STYLIST_THEME_ID],
                ] as const
              ).map(([app, id, fallback]) => {
                const theme = getSalonTheme(id, fallback);
                return (
                  <li
                    key={app}
                    className="flex items-center gap-1.5 rounded-full border border-ink/12 px-2.5 py-1 text-[0.68rem] text-muted"
                    title={`${app}: ${theme.label}`}
                  >
                    <span
                      className="block h-3 w-3 rounded-full"
                      style={{
                        background: `linear-gradient(135deg, ${theme.dark.accent} 0%, ${theme.dark.bg2} 100%)`,
                      }}
                    />
                    {app} · {theme.label}
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-wrap gap-2 text-sm">
              <Link
                href={`/platform/salons/${salon.id}`}
                className="rounded-full border border-ink/20 px-4 py-2 font-medium text-ink-soft hover:border-ink"
              >
                Configure
              </Link>
              <a
                href={`/book/${salon.slug}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-ink/12 px-4 py-2 text-muted hover:border-ink/30"
              >
                Book
              </a>
              <a
                href={`/display/${salon.slug}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-ink/12 px-4 py-2 text-muted hover:border-ink/30"
              >
                Display
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
