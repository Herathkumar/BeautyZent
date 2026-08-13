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
          stroke="var(--goal-ring-track)"
          strokeWidth={stroke}
        />
        <circle
          className="earnings-goal-progress"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={onTrack ? "var(--goal-ring-on-track)" : "var(--goal-ring-progress)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="earnings-goal-center">
        <p className="text-[10px] font-semibold tracking-wide text-champagne uppercase">Today</p>
        <p className="font-[family-name:var(--font-display)] text-xl text-ink">
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
          <p className="text-xs font-semibold tracking-[0.16em] text-champagne uppercase">
            Store earnings
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-ink">
            Today&apos;s pulse
          </h2>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase ${
            goalMet
              ? "bg-[color:var(--t-accent-tint)] text-[color:var(--t-ok)]"
              : "bg-[color:rgb(var(--t-accent-rgb)/0.12)] text-champagne"
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
          <p className="mt-1 font-[family-name:var(--font-display)] text-3xl text-ink">
            ${centsToDollars(todaySummary.profitCents)}
          </p>
          <p className="mt-1 text-sm text-muted">
            ${centsToDollars(todaySummary.chargedCents)} charged · $
            {centsToDollars(todaySummary.stylistPayCents)} pay
          </p>
          {goal.remainingCents > 0 ? (
            <p className="mt-2 text-sm font-semibold text-[color:var(--t-warn)]">
              ${centsToDollars(goal.remainingCents)} to daily goal
            </p>
          ) : (
            <p className="mt-2 text-sm font-semibold text-[color:var(--t-ok)]">Daily goal reached</p>
          )}
        </div>
        <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--t-surface-1)] px-4 py-3">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">
            This week · profit
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-3xl text-ink">
            ${centsToDollars(weekSummary.profitCents)}
          </p>
          <p className="mt-1 text-sm text-muted">
            ${centsToDollars(weekSummary.chargedCents)} charged · $
            {centsToDollars(weekSummary.stylistPayCents)} pay
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-[color:var(--line)] pt-3">
        <span className="admin-text-link text-sm">View all earnings →</span>
      </div>
    </Link>
  );
}
