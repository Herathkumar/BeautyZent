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

type Payload = {
  today: string;
  week: {
    monday: string;
    prevWeek: string;
    nextWeek: string;
    canGoNext: boolean;
    label: string;
    isCurrentWeek: boolean;
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
  jobs: {
    id: string;
    startsAt: string;
    clientName: string;
    serviceName: string;
    stylistName: string;
    chargedCents: number;
    tipCents: number;
    excludedFromEarnings: boolean;
  }[];
};

function csvEscape(value: string | number) {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadStoreCsv(data: Payload) {
  const rows: string[] = [
    [
      "Type",
      "When",
      "Title",
      "Detail",
      "Amount ($)",
      "Excluded",
    ].join(","),
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
      `Paid $${centsToDollars(data.weekSummary.paidCents ?? 0)} · Owed $${centsToDollars(data.weekSummary.owedCents ?? 0)}`,
    ].join(",")
  );
  rows.push(
    ["Date", "Weekday", "Revenue ($)", "Profit ($)", "Charged ($)", "Tips ($)", "Stylist pay ($)", "Jobs"].join(
      ","
    )
  );
  for (const d of data.days) {
    rows.push(
      [
        csvEscape(d.date),
        csvEscape(d.weekday),
        csvEscape(centsToDollars(d.revenueCents)),
        csvEscape(centsToDollars(d.profitCents)),
        csvEscape(centsToDollars(d.chargedCents)),
        csvEscape(centsToDollars(d.tipCents)),
        csvEscape(centsToDollars(d.stylistPayCents)),
        csvEscape(d.jobCount),
      ].join(",")
    );
  }

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
}: {
  label: string;
  summary: SummaryBlock;
  testId: string;
  showPayout?: boolean;
}) {
  return (
    <div
      className="rounded-2xl border border-[#c9a87c]/25 bg-[#2a211c] p-5"
      data-testid={testId}
    >
      <p className="text-sm text-[#c9a87c]">{label}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-muted">Store profit</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[#f0c987]">
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
          {summary.voidedJobCount
            ? ` · ${summary.voidedJobCount} voided`
            : ""}
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted">
          {summary.jobCount} jobs · tips pass through to stylists
        </p>
      )}
    </div>
  );
}

export default function StoreEarningsPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState("");

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

  async function toggleExclude(appointmentId: string, excluded: boolean) {
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

  return (
    <main className="space-y-8" data-testid="store-earnings-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#c9a87c] uppercase">
            Revenue
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
            Store Earnings
          </h1>
          <p className="mt-2 text-muted">
            Profit = charged − stylist pay (hourly + commission). Tips pass through to stylists
            and are not counted in profit.
          </p>
        </div>
        <button
          type="button"
          disabled={!data || loading}
          onClick={() => data && downloadStoreCsv(data)}
          className="rounded-full border border-[#c9a87c]/45 px-4 py-2 text-sm text-[#f0c987] disabled:opacity-40"
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
        <p className="rounded-xl border border-[#c9a87c]/35 bg-[#3a2a22] px-4 py-2 text-sm text-[#f0c987]">
          {msg}
        </p>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <SummaryCard
              label="Today"
              summary={data.todaySummary}
              testId="store-earnings-today"
            />
            <SummaryCard
              label="This week"
              summary={data.weekSummary}
              testId="store-earnings-week"
              showPayout
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-full border border-[#c9a87c]/35 px-3 py-1.5 text-sm text-[#f0c987]"
                onClick={() => load(data.week.prevWeek)}
              >
                ← Prev
              </button>
              <button
                type="button"
                disabled={!data.week.canGoNext}
                className="rounded-full border border-[#c9a87c]/35 px-3 py-1.5 text-sm text-[#f0c987] disabled:opacity-40"
                onClick={() => load(data.week.nextWeek)}
              >
                Next →
              </button>
            </div>
            <p className="text-sm text-[#d4c4b0]">
              {data.week.label}
              {data.week.isCurrentWeek ? " · Current week" : ""}
            </p>
          </div>

          <section className="rounded-3xl border border-[#c9a87c]/25 bg-[#2a211c] p-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="font-[family-name:var(--font-display)] text-xl text-[#fffaf6]">
                Daily breakdown
              </h2>
              <div className="flex items-center gap-4 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ background: "linear-gradient(180deg, #f0c987 0%, #c9a87c 100%)" }}
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
              style={{ height: 150 }}
              data-testid="store-earnings-bars"
            >
              {data.days.map((d) => {
                const revH = Math.max(4, Math.round((d.revenueCents / maxBar) * 110));
                const profitVis = Math.max(0, d.profitCents);
                const profitH = Math.max(
                  d.profitCents !== 0 ? 4 : 4,
                  Math.round((profitVis / maxBar) * 110)
                );
                return (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex h-[110px] items-end justify-center gap-0.5">
                      <div
                        className="w-[10px] rounded-t-sm sm:w-3"
                        style={{
                          height: revH,
                          background:
                            d.revenueCents > 0
                              ? "linear-gradient(180deg, #f0c987 0%, #c9a87c 100%)"
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
            <section className="space-y-3">
              <h2 className="font-[family-name:var(--font-display)] text-xl text-[#fffaf6]">
                By stylist
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.byStylist.map((s) => (
                  <div
                    key={s.stylistId}
                    className="rounded-2xl border border-[#c9a87c]/20 bg-[#2a211c] px-4 py-3"
                  >
                    <p className="font-semibold text-[#fffaf6]">{s.stylistName}</p>
                    <p className="mt-1 text-sm text-[#f0c987]">
                      Charged ${centsToDollars(s.chargedCents)} · pay $
                      {centsToDollars(s.stylistPayCents)}
                    </p>
                    <p className="text-xs text-muted">
                      {s.jobCount} jobs · tips ${centsToDollars(s.tipCents)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-display)] text-xl text-[#fffaf6]">
              Activity
            </h2>
            {data.activities.length === 0 ? (
              <p className="text-sm text-muted">No store activity this week yet.</p>
            ) : (
              <ul className="space-y-2" data-testid="store-earnings-activity">
                {data.activities.map((a) => (
                  <li
                    key={a.id}
                    className={`rounded-2xl border px-4 py-3 ${
                      a.excluded
                        ? "border-red-400/30 bg-red-950/20 opacity-70"
                        : "border-[#c9a87c]/20 bg-[#2a211c]"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold tracking-wide text-[#c9a87c] uppercase">
                          {a.kind === "JOB"
                            ? a.excluded
                              ? "Job · voided"
                              : "Job"
                            : a.kind === "PAYOUT"
                              ? "Payout"
                              : "Leave"}
                        </p>
                        <p className="mt-1 font-semibold text-[#fffaf6]">{a.title}</p>
                        <p className="text-sm text-muted">{a.detail}</p>
                      </div>
                      <div className="text-right">
                        {a.amountCents != null ? (
                          <p className="font-semibold text-[#f0c987]">
                            ${centsToDollars(a.amountCents)}
                          </p>
                        ) : null}
                        {a.kind === "JOB" && a.appointmentId ? (
                          <button
                            type="button"
                            disabled={busyId === a.appointmentId}
                            className="mt-2 text-xs text-[#c9a87c] underline disabled:opacity-40"
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
