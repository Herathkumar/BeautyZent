"use client";

import { useCallback, useEffect, useState } from "react";
import { centsToDollars } from "@/lib/pay";

type DayBar = {
  date: string;
  weekday: string;
  jobCount: number;
  earningsCents: number;
  chargedCentsTotal: number;
  tipCentsTotal: number;
  workedMinutes: number;
};

type EarningsPayload = {
  stylistName: string;
  motivation: string;
  paySettings: {
    payType: string;
    hourlyRateCents: number;
    commissionBps: number;
  };
  week: {
    monday: string;
    prevWeek: string;
    nextWeek: string;
    canGoNext: boolean;
    label: string;
    isCurrentWeek: boolean;
  };
  goal: {
    weeklyGoalCents: number;
    weekEarningsCents: number;
    progress: number;
    remainingCents: number;
  };
  summary: {
    weekEarningsCents: number;
    weekChargedCents: number;
    weekTipCents: number;
    weekJobs: number;
    weekHours: number;
    hourlyPayCents: number;
    commissionPayCents: number;
    tipPayCents: number;
    ytdEarningsCents: number;
    paidCents: number;
    pendingCents: number;
  };
  days: DayBar[];
  jobs: {
    id: string;
    startsAt: string;
    clientName: string;
    serviceName: string;
    chargedCents: number;
    tipCents: number;
    durationMin: number;
  }[];
};

function GoalRing({ progress, earned, goal }: { progress: number; earned: number; goal: number }) {
  const size = 148;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <div className="earnings-goal-ring mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(126,196,184,0.22)"
          strokeWidth={stroke}
        />
        <circle
          className="earnings-goal-progress"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#b5ebe0"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="earnings-goal-center">
        <p className="text-[10px] font-semibold tracking-wide text-[#7ec4b8] uppercase">Goal</p>
        <p className="font-[family-name:var(--font-display)] text-xl text-[#b5ebe0]">
          ${centsToDollars(earned)}
        </p>
        <p className="text-[11px] text-muted">of ${centsToDollars(goal)}</p>
      </div>
    </div>
  );
}

export default function StylistEarningsPage() {
  const [data, setData] = useState<EarningsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [goalMsg, setGoalMsg] = useState("");

  const load = useCallback(async (weekMonday?: string | null) => {
    setLoading(true);
    setError("");
    const q = weekMonday ? `?week=${weekMonday}` : "";
    const res = await fetch(`/api/stylist/earnings${q}`);
    if (res.status === 401) {
      window.location.href = "/stylist/login";
      return;
    }
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Could not load earnings");
      setLoading(false);
      return;
    }
    setData(json);
    setLoading(false);

    // Clear payout badge once stylist opens Earnings.
    void fetch("/api/stylist/earnings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markPayoutsSeen" }),
    });
  }, []);

  useEffect(() => {
    void load(null);
  }, [load]);

  async function editGoal() {
    if (!data) return;
    const raw = window.prompt(
      "Weekly earnings goal ($)",
      centsToDollars(data.goal.weeklyGoalCents)
    );
    if (raw === null) return;
    const res = await fetch("/api/stylist/earnings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setWeeklyGoal", weeklyGoalDollars: raw }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setGoalMsg(json.error || "Could not save goal");
      return;
    }
    setGoalMsg("Goal updated.");
    await load(data.week.monday);
  }

  const maxBar = Math.max(1, ...(data?.days.map((d) => d.earningsCents) || [1]));

  return (
    <main className="space-y-6">
      <header>
        <p className="text-xs font-semibold tracking-[0.2em] text-champagne uppercase">
          Your money
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[#fffaf6]">
          Earnings
        </h1>
        {data ? (
          <p className="mt-2 text-sm text-muted">{data.motivation}</p>
        ) : null}
      </header>

      {data?.paySettings ? (
        <section className="rounded-2xl border border-[#7ec4b8]/25 bg-[#1a282c] px-4 py-3">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-[#7ec4b8] uppercase">
            Your pay plan
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(data.paySettings.payType === "HOURLY" ||
              data.paySettings.payType === "BOTH") && (
              <div className="rounded-xl border border-[#7ec4b8]/25 bg-[#10181c] px-3 py-2">
                <p className="text-[10px] font-semibold tracking-wide text-muted uppercase">
                  Hourly rate
                </p>
                <p className="mt-0.5 text-lg font-bold text-[#b5ebe0]">
                  {data.paySettings.hourlyRateCents > 0
                    ? `$${centsToDollars(data.paySettings.hourlyRateCents)}/hr`
                    : "Not set"}
                </p>
              </div>
            )}
            {(data.paySettings.payType === "COMMISSION" ||
              data.paySettings.payType === "BOTH" ||
              !["HOURLY", "BOTH"].includes(data.paySettings.payType)) && (
              <div className="rounded-xl border border-[#7ec4b8]/25 bg-[#10181c] px-3 py-2">
                <p className="text-[10px] font-semibold tracking-wide text-muted uppercase">
                  Commission
                </p>
                <p className="mt-0.5 text-lg font-bold text-[#b5ebe0]">
                  {data.paySettings.commissionBps > 0
                    ? `${(data.paySettings.commissionBps / 100).toFixed(0)}%`
                    : "Not set"}
                </p>
              </div>
            )}
            <div className="rounded-xl border border-[#7ec4b8]/25 bg-[#10181c] px-3 py-2">
              <p className="text-[10px] font-semibold tracking-wide text-muted uppercase">
                Tips
              </p>
              <p className="mt-0.5 text-lg font-bold text-[#9fe3b8]">100%</p>
            </div>
          </div>
        </section>
      ) : null}

      {error ? <p className="text-sm text-[#f5a8a8]">{error}</p> : null}
      {goalMsg ? <p className="text-sm text-[#9fe3b8]">{goalMsg}</p> : null}
      {loading && !data ? (
        <p className="py-10 text-center text-muted">Loading your week…</p>
      ) : null}

      {data ? (
        <>
          <section className="earnings-hero rounded-3xl p-5">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                className="earnings-week-nav"
                aria-label="Previous week"
                onClick={() => load(data.week.prevWeek)}
              >
                ‹
              </button>
              <div className="text-center">
                <p className="text-xs font-semibold tracking-wide text-[#7ec4b8] uppercase">
                  {data.week.isCurrentWeek ? "This week" : "Week of"}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#fffaf6]">{data.week.label}</p>
              </div>
              <button
                type="button"
                className="earnings-week-nav"
                aria-label="Next week"
                disabled={!data.week.canGoNext}
                onClick={() => data.week.canGoNext && load(data.week.nextWeek)}
              >
                ›
              </button>
            </div>

            <div className="mt-5">
              <GoalRing
                progress={data.goal.progress}
                earned={data.goal.weekEarningsCents}
                goal={data.goal.weeklyGoalCents}
              />
            </div>

            <p className="mt-4 text-center text-xs tracking-[0.18em] text-[#7ec4b8] uppercase">
              Week total
            </p>
            <p className="mt-1 text-center font-[family-name:var(--font-display)] text-5xl text-[#b5ebe0]">
              ${centsToDollars(data.summary.weekEarningsCents)}
            </p>
            <p className="mt-2 text-center text-sm text-muted">
              {data.summary.weekJobs} job{data.summary.weekJobs === 1 ? "" : "s"} ·{" "}
              {data.summary.weekHours} hrs · ${centsToDollars(data.summary.weekChargedCents)}{" "}
              charged
              {data.summary.weekTipCents > 0
                ? ` · $${centsToDollars(data.summary.weekTipCents)} tips`
                : ""}
            </p>
            {data.goal.remainingCents > 0 ? (
              <p className="mt-2 text-center text-sm text-[#7ec4b8]">
                ${centsToDollars(data.goal.remainingCents)} to hit your goal
              </p>
            ) : (
              <p className="mt-2 text-center text-sm text-[#9fe3b8]">Weekly goal reached</p>
            )}
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => void editGoal()}
                className="text-xs font-semibold tracking-wide text-[#7ec4b8] underline-offset-2 hover:underline"
              >
                Edit weekly goal
              </button>
            </div>
          </section>

          <section className="grid grid-cols-3 gap-2">
            <div className="earnings-stat rounded-2xl p-3 text-center">
              <p className="text-[10px] font-semibold tracking-wide text-[#7ec4b8] uppercase">
                YTD earned
              </p>
              <p className="mt-1 text-lg font-bold text-[#fffaf6]">
                ${centsToDollars(data.summary.ytdEarningsCents)}
              </p>
            </div>
            <div className="earnings-stat rounded-2xl p-3 text-center">
              <p className="text-[10px] font-semibold tracking-wide text-[#9fe3b8] uppercase">
                Paid
              </p>
              <p className="mt-1 text-lg font-bold text-[#9fe3b8]">
                ${centsToDollars(data.summary.paidCents)}
              </p>
            </div>
            <div className="earnings-stat rounded-2xl p-3 text-center">
              <p className="text-[10px] font-semibold tracking-wide text-[#b5ebe0] uppercase">
                Pending
              </p>
              <p className="mt-1 text-lg font-bold text-[#b5ebe0]">
                ${centsToDollars(data.summary.pendingCents)}
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-ink/15 bg-cream p-4">
            <div className="mb-3 flex items-end justify-between">
              <h2 className="font-[family-name:var(--font-display)] text-xl">Daily</h2>
              <p className="text-xs text-muted">Tap a week above to browse</p>
            </div>
            <div className="earnings-bars flex items-end justify-between gap-1.5 pt-2" style={{ height: 140 }}>
              {data.days.map((d) => {
                const h = Math.max(6, Math.round((d.earningsCents / maxBar) * 110));
                return (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
                    <p className="text-[10px] font-semibold text-[#b5ebe0]">
                      {d.earningsCents > 0 ? `$${centsToDollars(d.earningsCents)}` : ""}
                    </p>
                    <div
                      className={`earnings-bar w-full max-w-[36px] rounded-t-lg ${
                        d.earningsCents > 0 ? "has-earn" : ""
                      }`}
                      style={{ height: h }}
                      title={`${d.weekday}: $${centsToDollars(d.earningsCents)}`}
                    />
                    <p className="text-[11px] font-semibold text-muted">{d.weekday}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {(data.summary.hourlyPayCents > 0 ||
            data.summary.commissionPayCents > 0 ||
            data.summary.tipPayCents > 0) && (
            <section className="grid gap-2 sm:grid-cols-3">
              {data.summary.hourlyPayCents > 0 ? (
                <div className="rounded-2xl border border-ink/15 bg-cream px-4 py-3">
                  <p className="text-xs text-muted">Hourly portion</p>
                  <p className="text-xl font-bold text-[#fffaf6]">
                    ${centsToDollars(data.summary.hourlyPayCents)}
                  </p>
                </div>
              ) : null}
              {data.summary.commissionPayCents > 0 ? (
                <div className="rounded-2xl border border-ink/15 bg-cream px-4 py-3">
                  <p className="text-xs text-muted">Commission portion</p>
                  <p className="text-xl font-bold text-[#fffaf6]">
                    ${centsToDollars(data.summary.commissionPayCents)}
                  </p>
                </div>
              ) : null}
              {data.summary.tipPayCents > 0 ? (
                <div className="rounded-2xl border border-ink/15 bg-cream px-4 py-3">
                  <p className="text-xs text-muted">Tips (100%)</p>
                  <p className="text-xl font-bold text-[#fffaf6]">
                    ${centsToDollars(data.summary.tipPayCents)}
                  </p>
                </div>
              ) : null}
            </section>
          )}

          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-display)] text-xl">This week’s jobs</h2>
            <div className="divide-y divide-ink/10 overflow-hidden rounded-2xl border border-ink/15 bg-cream">
              {data.jobs.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted">
                  No completed jobs this week yet.
                </p>
              ) : null}
              {data.jobs.map((j) => (
                <div key={j.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="font-semibold text-[#fffaf6]">{j.clientName}</p>
                    <p className="text-sm text-muted">
                      {j.serviceName} · {j.durationMin} min ·{" "}
                      {new Date(j.startsAt).toLocaleString("en-CA", {
                        weekday: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-[#b5ebe0]">
                      ${centsToDollars(j.chargedCents)}
                    </p>
                    {j.tipCents > 0 ? (
                      <p className="text-xs text-[#9fe3b8]">+${centsToDollars(j.tipCents)} tip</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted">
              Charged amounts are what the client paid for the service. Tips go 100% to you on
              top of hourly / commission pay.
            </p>
          </section>
        </>
      ) : null}
    </main>
  );
}
