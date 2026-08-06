import Link from "next/link";
import { getFloorRoster } from "@/lib/floor-roster";

function jobsLabel(n: number) {
  return n === 1 ? "1 job" : `${n} jobs`;
}

export async function DashboardFloorToday({ salonId }: { salonId: string }) {
  const data = await getFloorRoster({ salonId });
  const onFloor = data.onFloor;
  const away = data.away;

  return (
    <section
      className="admin-stat-card rounded-2xl p-5 sm:p-6"
      data-testid="dashboard-who-working"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link href="/manager/working" className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.16em] text-[#7d6154] uppercase">
            Floor today
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[#2b2521]">
            {onFloor.length === 0
              ? "No one on the floor"
              : `${onFloor.length} stylist${onFloor.length === 1 ? "" : "s"} on floor`}
          </h2>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {data.counts.away > 0 ? (
            <span className="rounded-full bg-[#f8efe6] px-2.5 py-1 text-[11px] font-bold text-[#8a5530]">
              {data.counts.away} away
            </span>
          ) : null}
          {data.counts.off > 0 ? (
            <span className="rounded-full bg-[#efeae4] px-2.5 py-1 text-[11px] font-bold text-[#5c4f47]">
              {data.counts.off} off
            </span>
          ) : null}
          <Link href="/manager/working" className="admin-pill">
            Full roster
          </Link>
        </div>
      </div>

      {onFloor.length > 0 ? (
        <ul
          className="mt-4 divide-y divide-[#7d6154]/12 overflow-hidden rounded-2xl border border-[#7d6154]/15"
          data-testid="dashboard-floor-list"
        >
          {onFloor.map((s, i) => (
            <li
              key={s.id}
              className={`px-3 py-3 transition hover:bg-[#faf6f1] ${
                i % 2 === 1 ? "bg-[#fffcf9]" : "bg-white"
              }`}
              data-testid="dashboard-floor-stylist"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/manager/working?stylist=${encodeURIComponent(s.id)}`}
                    className="inline-flex items-center gap-2"
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-[#7d6154]/25"
                      style={{ background: s.color }}
                      aria-hidden
                    />
                    <span className="font-semibold text-[#2b2521]">{s.name}</span>
                  </Link>
                  <p className="mt-1 text-sm text-muted">
                    <span data-testid="dashboard-floor-jobs">{jobsLabel(s.assignedJobs)}</span>
                    <span className="text-[#7d6154]/40"> · </span>
                    <span data-testid="dashboard-floor-available">{s.availableLabel}</span>
                  </p>
                  {s.phone || s.email ? (
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[#5c4f47]">
                      {s.phone ? (
                        <a
                          href={`tel:${s.phone.replace(/[^\d+]/g, "")}`}
                          className="admin-text-link"
                          data-testid="dashboard-floor-phone"
                        >
                          {s.phone}
                        </a>
                      ) : null}
                      {s.email ? (
                        <a
                          href={`mailto:${s.email}`}
                          className="break-all admin-text-link"
                          data-testid="dashboard-floor-email"
                        >
                          {s.email}
                        </a>
                      ) : null}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-sm font-medium text-[#7d6154]">{s.summary}</span>
                  <Link
                    href={`/manager/working?stylist=${encodeURIComponent(s.id)}`}
                    className="admin-pill"
                  >
                    View jobs
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">
          {away.length > 0
            ? `${away.map((a) => a.name).join(", ")} away today.`
            : "Everyone is off today."}
        </p>
      )}

      {away.length > 0 && onFloor.length > 0 ? (
        <p className="mt-3 text-xs text-muted">
          Away: {away.map((a) => a.name).join(", ")}
        </p>
      ) : null}
    </section>
  );
}
