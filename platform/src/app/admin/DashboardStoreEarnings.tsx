import Link from "next/link";
import { centsToDollars } from "@/lib/pay";
import { getDashboardStoreEarnings } from "@/lib/store-earnings-summary";

export async function DashboardStoreEarnings({ salonId }: { salonId: string }) {
  const { todaySummary, weekSummary } = await getDashboardStoreEarnings(salonId);

  return (
    <Link
      href="/manager/earnings"
      className="admin-stat-card mt-6 block rounded-2xl p-5"
      data-testid="dashboard-store-earnings"
    >
      <p className="text-sm text-[#c9a87c]">Store earnings</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Today · profit</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[#f0c987]">
            ${centsToDollars(todaySummary.profitCents)}
          </p>
          <p className="text-xs text-muted">
            ${centsToDollars(todaySummary.chargedCents)} charged · $
            {centsToDollars(todaySummary.stylistPayCents)} pay
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">This week · profit</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[#f0c987]">
            ${centsToDollars(weekSummary.profitCents)}
          </p>
          <p className="text-xs text-muted">
            ${centsToDollars(weekSummary.chargedCents)} charged · $
            {centsToDollars(weekSummary.stylistPayCents)} pay
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm text-[#c9a87c]">View all earnings →</p>
    </Link>
  );
}
