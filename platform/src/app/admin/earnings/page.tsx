"use client";

import { useCallback, useEffect, useState } from "react";
import { centsToDollars } from "@/lib/pay";

type DayBar = {
  date: string;
  weekday: string;
  jobCount: number;
  chargedCents: number;
  tipCents: number;
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
  todaySummary: {
    chargedCents: number;
    tipCents: number;
    totalCents: number;
    jobCount: number;
  };
  weekSummary: {
    chargedCents: number;
    tipCents: number;
    totalCents: number;
    jobCount: number;
    voidedJobCount: number;
  };
  days: DayBar[];
  byStylist: {
    stylistId: string;
    stylistName: string;
    chargedCents: number;
    tipCents: number;
    jobCount: number;
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
      "WEEK TOTAL",
      data.week.label,
      `${data.weekSummary.jobCount} jobs`,
      `Tips $${centsToDollars(data.weekSummary.tipCents)}`,
      centsToDollars(data.weekSummary.totalCents),
      data.weekSummary.voidedJobCount ? `${data.weekSummary.voidedJobCount} voided` : "",
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

  const maxBar = Math.max(1, ...(data?.days.map((d) => d.totalCents) || [1]));

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
            Store charges and tips this week. Void a job to exclude it from store totals and
            stylist commission/tips. Hourly pay still uses scheduled hours (minus approved leave).
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
            <div
              className="rounded-2xl border border-[#c9a87c]/25 bg-[#2a211c] p-5"
              data-testid="store-earnings-today"
            >
              <p className="text-sm text-[#c9a87c]">Today</p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#f0c987]">
                ${centsToDollars(data.todaySummary.totalCents)}
              </p>
              <p className="mt-1 text-sm text-muted">
                ${centsToDollars(data.todaySummary.chargedCents)} charged · $
                {centsToDollars(data.todaySummary.tipCents)} tips · {data.todaySummary.jobCount}{" "}
                jobs
              </p>
            </div>
            <div
              className="rounded-2xl border border-[#c9a87c]/25 bg-[#2a211c] p-5"
              data-testid="store-earnings-week"
            >
              <p className="text-sm text-[#c9a87c]">This week</p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#f0c987]">
                ${centsToDollars(data.weekSummary.totalCents)}
              </p>
              <p className="mt-1 text-sm text-muted">
                ${centsToDollars(data.weekSummary.chargedCents)} charged · $
                {centsToDollars(data.weekSummary.tipCents)} tips · {data.weekSummary.jobCount}{" "}
                jobs
                {data.weekSummary.voidedJobCount
                  ? ` · ${data.weekSummary.voidedJobCount} voided`
                  : ""}
              </p>
            </div>
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
            <h2 className="font-[family-name:var(--font-display)] text-xl text-[#fffaf6]">
              Daily breakdown
            </h2>
            <div
              className="mt-3 flex items-end justify-between gap-1.5 pt-2"
              style={{ height: 140 }}
              data-testid="store-earnings-bars"
            >
              {data.days.map((d) => {
                const h = Math.max(6, Math.round((d.totalCents / maxBar) * 110));
                return (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
                    <p className="text-[10px] font-semibold text-[#f0c987]">
                      {d.totalCents > 0 ? `$${centsToDollars(d.totalCents)}` : ""}
                    </p>
                    <div
                      className="w-full max-w-[36px] rounded-t-lg"
                      style={{
                        height: h,
                        background:
                          d.totalCents > 0
                            ? "linear-gradient(180deg, #f0c987 0%, #c9a87c 100%)"
                            : "rgba(201, 168, 124, 0.18)",
                      }}
                      title={`${d.weekday}: $${centsToDollars(d.totalCents)}`}
                    />
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
                      ${centsToDollars(s.chargedCents + s.tipCents)}
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
