"use client";

import { useCallback, useEffect, useState } from "react";
import { centsToDollars } from "@/lib/pay";

type DayBar = {
  date: string;
  weekday: string;
  jobCount: number;
  chargedCents: number;
  tipCents: number;
  revenueCents: number;
  stylistPayCents: number;
  profitCents: number;
  totalCents: number;
};

type Activity = {
  id: string;
  kind: "JOB" | "PAYOUT" | "LEAVE";
  at: string;
  title: string;
  detail: string;
  amountCents: number | null;
  excluded?: boolean;
  appointmentId?: string;
  stylistName?: string;
};

type SummaryBlock = {
  chargedCents: number;
  tipCents: number;
  revenueCents: number;
  stylistPayCents: number;
  profitCents: number;
  totalCents: number;
  jobCount: number;
  paidCents?: number;
  owedCents?: number;
  voidedJobCount?: number;
};

type JobRow = {
  id: string;
  startsAt: string;
  clientName: string;
  serviceName: string;
  stylistId?: string;
  stylistName: string;
  chargedCents: number;
  tipCents: number;
  excludedFromEarnings: boolean;
};

type BreakdownView =
  | { kind: "today" }
  | { kind: "week" }
  | { kind: "stylist"; stylistId: string };

type Payload = {
  today: string;
  motivation?: string;
  week: {
    monday: string;
    prevWeek: string;
    nextWeek: string;
    canGoNext: boolean;
    label: string;
    isCurrentWeek: boolean;
  };
  goal: {
    weeklyProfitGoalCents: number;
    weekProfitCents: number;
    progress: number;
    remainingCents: number;
  };
  todaySummary: SummaryBlock;
  weekSummary: SummaryBlock;
  days: DayBar[];
  byStylist: {
    stylistId: string;
    stylistName: string;
    chargedCents: number;
    tipCents: number;
    jobCount: number;
    stylistPayCents: number;
  }[];
  activities: Activity[];
  jobs: JobRow[];
  todayJobs: JobRow[];
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
          stroke="rgba(125,97,84,0.25)"
          strokeWidth={stroke}
        />
        <circle
          className="earnings-goal-progress"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#7d6154"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="earnings-goal-center">
        <p className="text-[10px] font-semibold tracking-wide text-[#7d6154] uppercase">Goal</p>
        <p className="font-[family-name:var(--font-display)] text-xl text-[#7d6154]">
          ${centsToDollars(earned)}
        </p>
        <p className="text-[11px] text-muted">of ${centsToDollars(goal)}</p>
      </div>
    </div>
  );
}

function csvEscape(value: string | number) {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadStoreCsv(data: Payload) {
  const rows: string[] = [
    ["Type", "When", "Title", "Detail", "Amount ($)", "Excluded"].join(","),
  ];
  for (const a of data.activities) {
    rows.push(
      [
        csvEscape(a.kind),
        csvEscape(a.at),
        csvEscape(a.title),
        csvEscape(a.detail),
        csvEscape(a.amountCents != null ? centsToDollars(a.amountCents) : ""),
        csvEscape(a.excluded ? "yes" : ""),
      ].join(",")
    );
  }
  rows.push("");
  rows.push(
    [
      "WEEK SUMMARY",
      data.week.label,
      `Revenue $${centsToDollars(data.weekSummary.revenueCents)}`,
      `Stylist pay $${centsToDollars(data.weekSummary.stylistPayCents)}`,
      `Profit $${centsToDollars(data.weekSummary.profitCents)}`,
      `Goal $${centsToDollars(data.goal.weeklyProfitGoalCents)}`,
    ].join(",")
  );

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `store-earnings-${data.week.monday}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function SummaryCard({
  label,
  summary,
  testId,
  showPayout,
  onOpen,
}: {
  label: string;
  summary: SummaryBlock;
  testId: string;
  showPayout?: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="admin-stat-card w-full rounded-2xl border border-[#7d6154]/25 bg-[#ffffff] p-5 text-left"
      data-testid={testId}
    >
      <p className="text-sm text-[#7d6154]">{label}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-muted">Store profit</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[#7d6154]">
        ${centsToDollars(summary.profitCents)}
      </p>
      <p className="mt-2 text-sm text-muted">
        ${centsToDollars(summary.chargedCents)} charged · $
        {centsToDollars(summary.stylistPayCents)} stylist pay · $
        {centsToDollars(summary.tipCents)} tips
      </p>
      {showPayout ? (
        <p className="mt-1 text-xs text-muted">
          Paid out ${centsToDollars(summary.paidCents ?? 0)}
          {(summary.owedCents ?? 0) > 0
            ? ` · $${centsToDollars(summary.owedCents ?? 0)} still owed`
            : " · paid in full for earned pay"}
          {summary.voidedJobCount ? ` · ${summary.voidedJobCount} voided` : ""}
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted">
          {summary.jobCount} jobs · tips pass through to stylists
        </p>
      )}
      <p className="mt-3 text-xs font-semibold tracking-wide text-[#7d6154]">
        View breakdown →
      </p>
    </button>
  );
}

function BreakdownModal({
  title,
  summary,
  jobs,
  days,
  byStylist,
  showPayout,
  onClose,
}: {
  title: string;
  summary: SummaryBlock;
  jobs: JobRow[];
  days?: DayBar[];
  byStylist?: Payload["byStylist"];
  showPayout?: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const activeJobs = jobs.filter((j) => !j.excludedFromEarnings);
  const voidedJobs = jobs.filter((j) => j.excludedFromEarnings);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid="store-earnings-breakdown"
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[#7d6154]/35 bg-[#fffcf9] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-[#7d6154] uppercase">
              Breakdown
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[#2b2521]">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#7d6154]/35 px-3 py-1 text-sm text-[#7d6154]"
          >
            Close
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            { label: "Charged", value: summary.chargedCents },
            { label: "Stylist pay", value: summary.stylistPayCents },
            { label: "Tips", value: summary.tipCents },
            { label: "Profit", value: summary.profitCents },
          ].map((row) => (
            <div
              key={row.label}
              className="rounded-2xl border border-[#7d6154]/20 bg-[#ffffff] px-3 py-2"
            >
              <p className="text-[10px] font-semibold tracking-wide text-muted uppercase">
                {row.label}
              </p>
              <p className="mt-1 text-lg font-bold text-[#7d6154]">
                ${centsToDollars(row.value)}
              </p>
            </div>
          ))}
        </div>

        {showPayout ? (
          <p className="mt-3 text-sm text-muted">
            Paid out ${centsToDollars(summary.paidCents ?? 0)}
            {(summary.owedCents ?? 0) > 0
              ? ` · $${centsToDollars(summary.owedCents ?? 0)} still owed`
              : " · paid in full for earned pay"}
          </p>
        ) : null}

        {days && days.length > 0 ? (
          <section className="mt-5 space-y-2">
            <h3 className="text-sm font-semibold text-[#2b2521]">By day</h3>
            <ul className="space-y-1.5">
              {days.map((d) => (
                <li
                  key={d.date}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-t border-[#7d6154]/15 pt-1.5 text-sm first:border-t-0 first:pt-0"
                >
                  <span className="text-[#6b5b52]">
                    {d.weekday} · {d.jobCount} job{d.jobCount === 1 ? "" : "s"}
                  </span>
                  <span className="text-[#7d6154]">
                    Rev ${centsToDollars(d.revenueCents)} · Profit $
                    {centsToDollars(d.profitCents)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {byStylist && byStylist.length > 0 ? (
          <section className="mt-5 space-y-2">
            <h3 className="text-sm font-semibold text-[#2b2521]">By stylist</h3>
            <ul className="space-y-1.5">
              {byStylist.map((s) => (
                <li
                  key={s.stylistId}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-t border-[#7d6154]/15 pt-1.5 text-sm first:border-t-0 first:pt-0"
                >
                  <span className="text-[#6b5b52]">
                    {s.stylistName} · {s.jobCount} job{s.jobCount === 1 ? "" : "s"}
                  </span>
                  <span className="text-[#7d6154]">
                    ${centsToDollars(s.chargedCents)} · pay $
                    {centsToDollars(s.stylistPayCents)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-5 space-y-2">
          <h3 className="text-sm font-semibold text-[#2b2521]">
            Jobs ({activeJobs.length}
            {voidedJobs.length ? ` · ${voidedJobs.length} voided` : ""})
          </h3>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted">No completed jobs in this period.</p>
          ) : (
            <ul className="space-y-2">
              {jobs.map((j) => (
                <li
                  key={j.id}
                  className={`rounded-2xl border px-3 py-2 text-sm ${
                    j.excludedFromEarnings
                      ? "border-red-400/30 bg-red-950/20 opacity-70"
                      : "border-[#7d6154]/20 bg-[#ffffff]"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[#2b2521]">
                        {j.clientName} · {j.serviceName}
                      </p>
                      <p className="text-xs text-muted">
                        {j.stylistName}
                        {j.excludedFromEarnings ? " · voided" : ""}
                      </p>
                    </div>
                    <p className="font-semibold text-[#7d6154]">
                      ${centsToDollars(j.chargedCents + j.tipCents)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default function StoreEarningsPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [goalMsg, setGoalMsg] = useState("");
  const [busyId, setBusyId] = useState("");
  const [breakdown, setBreakdown] = useState<BreakdownView | null>(null);
  const [activityKind, setActivityKind] = useState<"ALL" | "JOB" | "PAYOUT" | "LEAVE">("ALL");
  const [activityStylist, setActivityStylist] = useState("ALL");
  const [activityStatus, setActivityStatus] = useState<"ALL" | "ACTIVE" | "VOIDED">("ALL");
  const [activityQuery, setActivityQuery] = useState("");

  const load = useCallback(async (weekMonday?: string | null) => {
    setLoading(true);
    setError("");
    const q = weekMonday ? `?week=${weekMonday}` : "";
    const res = await fetch(`/api/admin/store-earnings${q}`);
    if (res.status === 401) {
      window.location.href = "/manager/login";
      return;
    }
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error || "Could not load store earnings");
      return;
    }
    setData(json);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function editGoal() {
    if (!data) return;
    const raw = window.prompt(
      "Weekly store profit goal ($)",
      centsToDollars(data.goal.weeklyProfitGoalCents)
    );
    if (raw === null) return;
    const res = await fetch("/api/admin/store-earnings", {
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

  async function toggleExclude(appointmentId: string, excluded: boolean) {
    const ok = window.confirm(
      excluded
        ? "Void this job from store totals and stylist commission/tips?"
        : "Restore this job to store totals and stylist earnings?"
    );
    if (!ok) return;

    setBusyId(appointmentId);
    setMsg("");
    const res = await fetch("/api/admin/store-earnings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setExcluded", appointmentId, excluded }),
    });
    const json = await res.json();
    setBusyId("");
    if (!res.ok) {
      setError(json.error || "Could not update job");
      return;
    }
    setMsg(excluded ? "Job voided from store & stylist earnings." : "Job restored to totals.");
    await load(data?.week.monday);
  }

  const maxBar = Math.max(
    1,
    ...(data?.days.flatMap((d) => [d.revenueCents, Math.max(0, d.profitCents)]) || [1])
  );

  const activityStylistOptions = Array.from(
    new Set(
      (data?.activities || [])
        .map((a) => a.stylistName)
        .filter((n): n is string => Boolean(n))
    )
  ).sort((a, b) => a.localeCompare(b));

  const filteredActivities = (data?.activities || []).filter((a) => {
    if (activityKind !== "ALL" && a.kind !== activityKind) return false;
    if (activityStylist !== "ALL" && a.stylistName !== activityStylist) return false;
    if (activityStatus === "VOIDED" && !a.excluded) return false;
    if (activityStatus === "ACTIVE" && a.excluded) return false;
    if (activityQuery.trim()) {
      const q = activityQuery.trim().toLowerCase();
      const hay = `${a.title} ${a.detail} ${a.stylistName || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <main className="space-y-8" data-testid="store-earnings-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#7d6154] uppercase">
            Revenue
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
            Store Earnings
          </h1>
          {data?.motivation ? (
            <p className="mt-2 text-sm text-muted">{data.motivation}</p>
          ) : (
            <p className="mt-2 text-muted">
              Profit = charged − stylist pay (hourly + commission). Tips pass through to stylists.
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={!data || loading}
          onClick={() => data && downloadStoreCsv(data)}
          className="rounded-full border border-[#7d6154]/45 px-4 py-2 text-sm text-[#7d6154] disabled:opacity-40"
        >
          Download CSV
        </button>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-400/40 bg-red-950/40 px-4 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {msg ? (
        <p className="rounded-xl border border-[#7d6154]/35 bg-[#f3ebe3] px-4 py-2 text-sm text-[#7d6154]">
          {msg}
        </p>
      ) : null}
      {goalMsg ? <p className="text-sm text-[#9fe3b8]">{goalMsg}</p> : null}

      {data ? (
        <>
          <section className="earnings-hero rounded-3xl p-5" data-testid="store-earnings-goal">
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
                <p className="text-xs font-semibold tracking-wide text-[#7d6154] uppercase">
                  {data.week.isCurrentWeek ? "This week" : "Week of"}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#2b2521]">{data.week.label}</p>
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
                earned={Math.max(0, data.goal.weekProfitCents)}
                goal={data.goal.weeklyProfitGoalCents}
              />
            </div>

            <p className="mt-4 text-center text-xs tracking-[0.18em] text-[#7d6154] uppercase">
              Week profit
            </p>
            <p className="mt-1 text-center font-[family-name:var(--font-display)] text-5xl text-[#7d6154]">
              ${centsToDollars(data.weekSummary.profitCents)}
            </p>
            <p className="mt-2 text-center text-sm text-muted">
              {data.weekSummary.jobCount} job{data.weekSummary.jobCount === 1 ? "" : "s"} · $
              {centsToDollars(data.weekSummary.chargedCents)} charged · $
              {centsToDollars(data.weekSummary.stylistPayCents)} stylist pay
              {data.weekSummary.tipCents > 0
                ? ` · $${centsToDollars(data.weekSummary.tipCents)} tips`
                : ""}
            </p>
            {data.goal.remainingCents > 0 ? (
              <p className="mt-2 text-center text-sm text-[#7d6154]">
                ${centsToDollars(data.goal.remainingCents)} to hit your goal
              </p>
            ) : (
              <p className="mt-2 text-center text-sm text-[#9fe3b8]">Weekly goal reached</p>
            )}
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => void editGoal()}
                className="text-xs font-semibold tracking-wide text-[#7d6154] underline-offset-2 hover:underline"
              >
                Edit weekly goal
              </button>
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <SummaryCard
              label="Today"
              summary={data.todaySummary}
              testId="store-earnings-today"
              onOpen={() => setBreakdown({ kind: "today" })}
            />
            <SummaryCard
              label="This week"
              summary={data.weekSummary}
              testId="store-earnings-week"
              showPayout
              onOpen={() => setBreakdown({ kind: "week" })}
            />
          </div>

          {breakdown?.kind === "today" ? (
            <BreakdownModal
              title="Today's earnings"
              summary={data.todaySummary}
              jobs={data.todayJobs || []}
              onClose={() => setBreakdown(null)}
            />
          ) : null}
          {breakdown?.kind === "week" ? (
            <BreakdownModal
              title={`Week of ${data.week.label}`}
              summary={data.weekSummary}
              jobs={data.jobs}
              days={data.days}
              byStylist={data.byStylist}
              showPayout
              onClose={() => setBreakdown(null)}
            />
          ) : null}
          {breakdown?.kind === "stylist"
            ? (() => {
                const s = data.byStylist.find((x) => x.stylistId === breakdown.stylistId);
                if (!s) return null;
                const stylistJobs = data.jobs.filter(
                  (j) => j.stylistId === s.stylistId || j.stylistName === s.stylistName
                );
                const active = stylistJobs.filter((j) => !j.excludedFromEarnings);
                const profitCents = s.chargedCents - s.stylistPayCents;
                return (
                  <BreakdownModal
                    title={`${s.stylistName} · this week`}
                    summary={{
                      chargedCents: s.chargedCents,
                      tipCents: s.tipCents,
                      revenueCents: s.chargedCents + s.tipCents,
                      stylistPayCents: s.stylistPayCents,
                      profitCents,
                      totalCents: s.chargedCents + s.tipCents,
                      jobCount: s.jobCount,
                      voidedJobCount: stylistJobs.length - active.length,
                    }}
                    jobs={stylistJobs}
                    onClose={() => setBreakdown(null)}
                  />
                );
              })()
            : null}

          <section className="rounded-3xl border border-[#7d6154]/25 bg-[#ffffff] p-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="font-[family-name:var(--font-display)] text-xl text-[#2b2521]">
                Daily breakdown
              </h2>
              <div className="flex items-center gap-4 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ background: "linear-gradient(180deg, #7d6154 0%, #7d6154 100%)" }}
                  />
                  Revenue
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ background: "linear-gradient(180deg, #9fe3b8 0%, #5fa87d 100%)" }}
                  />
                  Profit
                </span>
              </div>
            </div>
            <div
              className="mt-3 flex items-end justify-between gap-1 pt-2"
              style={{ height: 180 }}
              data-testid="store-earnings-bars"
            >
              {data.days.map((d) => {
                const revH = Math.max(4, Math.round((d.revenueCents / maxBar) * 110));
                const profitVis = Math.max(0, d.profitCents);
                const profitH = Math.max(4, Math.round((profitVis / maxBar) * 110));
                return (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex min-h-[2.1rem] flex-col items-center justify-end leading-tight">
                      <p className="text-[10px] font-semibold text-[#7d6154]">
                        {d.revenueCents > 0 ? `$${centsToDollars(d.revenueCents)}` : ""}
                      </p>
                      <p
                        className={`text-[10px] font-semibold ${
                          d.profitCents < 0 ? "text-[#f5a8a8]" : "text-[#9fe3b8]"
                        }`}
                      >
                        {d.profitCents !== 0 ? `$${centsToDollars(d.profitCents)}` : ""}
                      </p>
                    </div>
                    <div className="flex h-[110px] items-end justify-center gap-0.5">
                      <div
                        className="w-[10px] rounded-t-sm sm:w-3"
                        style={{
                          height: revH,
                          background:
                            d.revenueCents > 0
                              ? "linear-gradient(180deg, #7d6154 0%, #7d6154 100%)"
                              : "rgba(201, 168, 124, 0.18)",
                        }}
                        title={`Revenue $${centsToDollars(d.revenueCents)}`}
                      />
                      <div
                        className="w-[10px] rounded-t-sm sm:w-3"
                        style={{
                          height: profitH,
                          background:
                            d.profitCents > 0
                              ? "linear-gradient(180deg, #9fe3b8 0%, #5fa87d 100%)"
                              : d.profitCents < 0
                                ? "rgba(245, 168, 168, 0.55)"
                                : "rgba(159, 227, 184, 0.18)",
                        }}
                        title={`Profit $${centsToDollars(d.profitCents)}`}
                      />
                    </div>
                    <p className="text-[11px] font-semibold text-muted">{d.weekday}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {data.byStylist.length > 0 ? (
            <section className="space-y-3" data-testid="store-earnings-by-stylist">
              <h2 className="font-[family-name:var(--font-display)] text-xl text-[#2b2521]">
                By stylist
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.byStylist.map((s) => (
                  <button
                    key={s.stylistId}
                    type="button"
                    className="admin-stat-card rounded-2xl border border-[#7d6154]/20 bg-[#ffffff] px-4 py-3 text-left"
                    data-testid={`store-earnings-stylist-${s.stylistId}`}
                    onClick={() => setBreakdown({ kind: "stylist", stylistId: s.stylistId })}
                  >
                    <p className="font-semibold text-[#2b2521]">{s.stylistName}</p>
                    <p className="mt-1 text-sm text-[#7d6154]">
                      Charged ${centsToDollars(s.chargedCents)} · pay $
                      {centsToDollars(s.stylistPayCents)}
                    </p>
                    <p className="text-xs text-muted">
                      {s.jobCount} jobs · tips ${centsToDollars(s.tipCents)}
                    </p>
                    <p className="mt-2 text-xs font-semibold tracking-wide text-[#7d6154]">
                      View breakdown →
                    </p>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-[family-name:var(--font-display)] text-xl text-[#2b2521]">
                Activity
              </h2>
              <p className="text-xs text-muted">
                {filteredActivities.length} of {data.activities.length}
              </p>
            </div>

            <div
              className="grid gap-3 rounded-2xl border border-[#7d6154]/20 bg-[#ffffff] p-3 sm:grid-cols-2 lg:grid-cols-4"
              data-testid="store-earnings-activity-filters"
            >
              <label className="grid gap-1 text-[10px] font-semibold tracking-wide text-[#7d6154] uppercase">
                Type
                <select
                  value={activityKind}
                  onChange={(e) =>
                    setActivityKind(e.target.value as typeof activityKind)
                  }
                  aria-label="Filter activity type"
                  className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-sm font-normal normal-case text-[#2b2521]"
                >
                  <option value="ALL">All types</option>
                  <option value="JOB">Jobs</option>
                  <option value="PAYOUT">Payouts</option>
                  <option value="LEAVE">Leave</option>
                </select>
              </label>
              <label className="grid gap-1 text-[10px] font-semibold tracking-wide text-[#7d6154] uppercase">
                Stylist
                <select
                  value={activityStylist}
                  onChange={(e) => setActivityStylist(e.target.value)}
                  aria-label="Filter activity stylist"
                  className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-sm font-normal normal-case text-[#2b2521]"
                >
                  <option value="ALL">All stylists</option>
                  {activityStylistOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-[10px] font-semibold tracking-wide text-[#7d6154] uppercase">
                Status
                <select
                  value={activityStatus}
                  onChange={(e) =>
                    setActivityStatus(e.target.value as typeof activityStatus)
                  }
                  aria-label="Filter activity status"
                  className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-sm font-normal normal-case text-[#2b2521]"
                >
                  <option value="ALL">All statuses</option>
                  <option value="ACTIVE">Active (not voided)</option>
                  <option value="VOIDED">Voided only</option>
                </select>
              </label>
              <label className="grid gap-1 text-[10px] font-semibold tracking-wide text-[#7d6154] uppercase">
                Search
                <input
                  value={activityQuery}
                  onChange={(e) => setActivityQuery(e.target.value)}
                  aria-label="Search activity"
                  placeholder="Client, note…"
                  className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-sm font-normal normal-case text-[#2b2521]"
                />
              </label>
            </div>

            {data.activities.length === 0 ? (
              <p className="text-sm text-muted">No store activity this week yet.</p>
            ) : filteredActivities.length === 0 ? (
              <p className="text-sm text-muted">No activity matches these filters.</p>
            ) : (
              <ul className="space-y-2" data-testid="store-earnings-activity">
                {filteredActivities.map((a) => (
                  <li
                    key={a.id}
                    className={`rounded-2xl border px-4 py-3 ${
                      a.excluded
                        ? "border-red-400/30 bg-red-950/20 opacity-70"
                        : "border-[#7d6154]/20 bg-[#ffffff]"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold tracking-wide text-[#7d6154] uppercase">
                          {a.kind === "JOB"
                            ? a.excluded
                              ? "Job · voided"
                              : "Job"
                            : a.kind === "PAYOUT"
                              ? "Payout"
                              : "Leave"}
                        </p>
                        <p className="mt-1 font-semibold text-[#2b2521]">{a.title}</p>
                        <p className="text-sm text-muted">{a.detail}</p>
                      </div>
                      <div className="text-right">
                        {a.amountCents != null ? (
                          <p className="font-semibold text-[#7d6154]">
                            ${centsToDollars(a.amountCents)}
                          </p>
                        ) : null}
                        {a.kind === "JOB" && a.appointmentId ? (
                          <button
                            type="button"
                            disabled={busyId === a.appointmentId}
                            className="mt-2 text-xs text-[#7d6154] underline disabled:opacity-40"
                            onClick={() =>
                              toggleExclude(a.appointmentId!, !a.excluded)
                            }
                          >
                            {a.excluded ? "Restore" : "Void / exclude"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : loading ? (
        <p className="text-muted">Loading store earnings…</p>
      ) : null}
    </main>
  );
}
