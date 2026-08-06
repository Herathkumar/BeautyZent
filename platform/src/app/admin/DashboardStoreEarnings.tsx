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
  const size = 128;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(1, Math.max(0, progress)));
  const onTrack = progress >= 0.65 || earned >= goal;

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
          stroke="rgba(125,97,84,0.18)"
          strokeWidth={stroke}
        />
        <circle
          className="earnings-goal-progress"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={onTrack ? "#2f7a4f" : "#7d6154"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="earnings-goal-center">
        <p className="text-[10px] font-semibold tracking-wide text-[#7d6154] uppercase">
          Today
        </p>
        <p className="font-[family-name:var(--font-display)] text-xl text-[#2b2521]">
          ${centsToDollars(earned)}
        </p>
        <p className="text-[10px] text-muted">of ${centsToDollars(goal)}</p>
      </div>
    </div>
  );
}

export async function DashboardStoreEarnings({ salonId }: { salonId: string }) {
  const { todaySummary, weekSummary, goal } = await getDashboardStoreEarnings(salonId);
  const goalMet = goal.remainingCents <= 0;

  return (
    <Link
      href="/manager/earnings"
      className="admin-stat-card admin-hero-card block rounded-2xl p-5 sm:p-6"
      data-testid="dashboard-store-earnings"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-[#7d6154] uppercase">
            Store earnings
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[#2b2521]">
            Today&apos;s pulse
          </h2>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase ${
            goalMet
              ? "bg-[#e7f3eb] text-[#2f7a4f]"
              : "bg-[rgba(125,97,84,0.1)] text-[#7d6154]"
          }`}
        >
          {goalMet ? "Goal met" : "In progress"}
        </span>
      </div>

      <div className="mt-4 grid gap-5 sm:grid-cols-[auto_1fr_1fr] sm:items-center">
        <DailyGoalRing
          progress={goal.dailyProgress}
          earned={goal.todayProfitCents}
          goal={goal.dailyProfitGoalCents}
        />
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">
            Today · profit
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[#2b2521]">
            ${centsToDollars(todaySummary.profitCents)}
          </p>
          <p className="mt-1 text-sm text-muted">
            ${centsToDollars(todaySummary.chargedCents)} charged · $
            {centsToDollars(todaySummary.stylistPayCents)} pay
          </p>
          {goal.remainingCents > 0 ? (
            <p className="mt-2 text-sm font-semibold text-[#c47a4a]">
              ${centsToDollars(goal.remainingCents)} to daily goal
            </p>
          ) : (
            <p className="mt-2 text-sm font-semibold text-[#2f7a4f]">Daily goal reached</p>
          )}
        </div>
        <div className="rounded-2xl border border-[#7d6154]/15 bg-[#fffcf9] px-4 py-3">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">
            This week · profit
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[#2b2521]">
            ${centsToDollars(weekSummary.profitCents)}
          </p>
          <p className="mt-1 text-sm text-muted">
            ${centsToDollars(weekSummary.chargedCents)} charged · $
            {centsToDollars(weekSummary.stylistPayCents)} pay
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-[#7d6154]/12 pt-3">
        <span className="admin-text-link text-sm">View all earnings →</span>
      </div>
    </Link>
  );
}
