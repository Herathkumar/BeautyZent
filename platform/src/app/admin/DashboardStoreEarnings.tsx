import Link from "next/link";
import { centsToDollars } from "@/lib/pay";
import { getDashboardStoreEarnings } from "@/lib/store-earnings-summary";

function DailyGoalRing({
  progress,
  earned,
  goal,
}: {
  progress: number;
  earned: number;
  goal: number;
}) {
  const size = 120;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <div
      className="earnings-goal-ring mx-auto"
      style={{ width: size, height: size }}
      data-testid="dashboard-daily-goal-ring"
      aria-label={`Today profit $${centsToDollars(earned)} of $${centsToDollars(goal)} goal`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(201,168,124,0.2)"
          strokeWidth={stroke}
        />
        <circle
          className="earnings-goal-progress"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#f0c987"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="earnings-goal-center">
        <p className="text-[10px] font-semibold tracking-wide text-[#c9a87c] uppercase">
          Today
        </p>
        <p className="font-[family-name:var(--font-display)] text-lg text-[#f0c987]">
          ${centsToDollars(earned)}
        </p>
        <p className="text-[10px] text-muted">of ${centsToDollars(goal)}</p>
      </div>
    </div>
  );
}

export async function DashboardStoreEarnings({ salonId }: { salonId: string }) {
  const { todaySummary, weekSummary, goal } = await getDashboardStoreEarnings(salonId);

  return (
    <Link
      href="/manager/earnings"
      className="admin-stat-card mt-6 block rounded-2xl p-5"
      data-testid="dashboard-store-earnings"
    >
      <p className="text-sm text-[#c9a87c]">Store earnings</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-[auto_1fr_1fr] sm:items-center">
        <DailyGoalRing
          progress={goal.dailyProgress}
          earned={goal.todayProfitCents}
          goal={goal.dailyProfitGoalCents}
        />
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Today · profit</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[#f0c987]">
            ${centsToDollars(todaySummary.profitCents)}
          </p>
          <p className="text-xs text-muted">
            ${centsToDollars(todaySummary.chargedCents)} charged · $
            {centsToDollars(todaySummary.stylistPayCents)} pay
          </p>
          {goal.remainingCents > 0 ? (
            <p className="mt-1 text-xs text-[#c9a87c]">
              ${centsToDollars(goal.remainingCents)} to daily goal
            </p>
          ) : (
            <p className="mt-1 text-xs text-[#9fe3b8]">Daily goal reached</p>
          )}
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
