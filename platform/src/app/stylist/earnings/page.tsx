"use client";

import { useCallback, useEffect, useState } from "react";
import { centsToDollars } from "@/lib/pay";

type DayBar = {
  date: string;
  weekday: string;
  jobCount: number;
  earningsCents: number;
  chargedCentsTotal: number;
  workedMinutes: number;
};

type EarningsPayload = {
  stylistName: string;
  motivation: string;
  week: {
    monday: string;
    prevWeek: string;
    nextWeek: string;
    canGoNext: boolean;
    label: string;
    isCurrentWeek: boolean;
  };
  summary: {
    weekEarningsCents: number;
    weekChargedCents: number;
    weekJobs: number;
    weekHours: number;
    hourlyPayCents: number;
    commissionPayCents: number;
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
    durationMin: number;
  }[];
};

export default function StylistEarningsPage() {
  const [data, setData] = useState<EarningsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
  }, []);

  useEffect(() => {
    void load(null);
  }, [load]);

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

      {error ? <p className="text-sm text-[#f5a8a8]">{error}</p> : null}
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
                <p className="text-xs font-semibold tracking-wide text-[#c9a87c] uppercase">
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

            <p className="mt-6 text-center text-xs tracking-[0.18em] text-[#c9a87c] uppercase">
              Week total
            </p>
            <p className="mt-1 text-center font-[family-name:var(--font-display)] text-5xl text-[#f0c987]">
              ${centsToDollars(data.summary.weekEarningsCents)}
            </p>
            <p className="mt-2 text-center text-sm text-muted">
              {data.summary.weekJobs} job{data.summary.weekJobs === 1 ? "" : "s"} ·{" "}
              {data.summary.weekHours} hrs · ${centsToDollars(data.summary.weekChargedCents)}{" "}
              charged
            </p>
          </section>

          <section className="grid grid-cols-3 gap-2">
            <div className="earnings-stat rounded-2xl p-3 text-center">
              <p className="text-[10px] font-semibold tracking-wide text-[#c9a87c] uppercase">
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
              <p className="text-[10px] font-semibold tracking-wide text-[#f0c987] uppercase">
                Pending
              </p>
              <p className="mt-1 text-lg font-bold text-[#f0c987]">
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
                    <p className="text-[10px] font-semibold text-[#f0c987]">
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

          {(data.summary.hourlyPayCents > 0 || data.summary.commissionPayCents > 0) && (
            <section className="grid gap-2 sm:grid-cols-2">
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
                  <p className="shrink-0 font-bold text-[#f0c987]">
                    ${centsToDollars(j.chargedCents)}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted">
              Charged amounts are what the client paid. Your pay is calculated from your
              hourly / commission settings.
            </p>
          </section>
        </>
      ) : null}
    </main>
  );
}
