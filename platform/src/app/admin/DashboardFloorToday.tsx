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
    <Link
      href="/manager/working"
      className="admin-stat-card mt-8 block rounded-2xl p-5"
      data-testid="dashboard-who-working"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm text-[#c9a87c]">Floor today</p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[#fffaf6]">
            {onFloor.length === 0
              ? "No one on the floor"
              : `${onFloor.length} stylist${onFloor.length === 1 ? "" : "s"} on floor`}
          </h2>
        </div>
        <p className="text-xs text-muted">
          {data.counts.away > 0 ? `${data.counts.away} away` : null}
          {data.counts.away > 0 && data.counts.off > 0 ? " · " : null}
          {data.counts.off > 0 ? `${data.counts.off} off` : null}
        </p>
      </div>

      {onFloor.length > 0 ? (
        <ul className="mt-4 space-y-3" data-testid="dashboard-floor-list">
          {onFloor.map((s) => (
            <li
              key={s.id}
              className="border-t border-[#c9a87c]/15 pt-3 first:border-t-0 first:pt-0"
              data-testid="dashboard-floor-stylist"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold text-[#fffaf6]">{s.name}</span>
                <span className="text-sm text-[#f0c987]">{s.summary}</span>
              </div>
              <p className="mt-1 text-sm text-muted">
                <span data-testid="dashboard-floor-jobs">{jobsLabel(s.assignedJobs)}</span>
                <span className="text-white/25"> · </span>
                <span data-testid="dashboard-floor-available">{s.availableLabel}</span>
              </p>
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
    </Link>
  );
}
