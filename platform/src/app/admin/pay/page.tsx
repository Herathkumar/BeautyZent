"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { centsToDollars } from "@/lib/pay";

type Job = {
  id: string;
  startsAt: string;
  clientName: string;
  serviceName: string;
  durationMin: number;
  chargedCents: number;
};

type Report = {
  stylist: {
    id: string;
    name: string;
    payType: string;
    hourlyRateCents: number | null;
    commissionBps: number | null;
    selfManageSchedule: boolean;
  };
  jobs: Job[];
  chargedCentsTotal: number;
  workedMinutes: number;
  hourlyPay: number;
  commissionPay: number;
  totalPay: number;
  payouts: { id: string; amountCents: number; paidAt: string | null; note: string | null }[];
};

type LeaveReq = {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  note: string | null;
  stylist: { id: string; name: string };
};

export default function AdminPayPage() {
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [stylistId, setStylistId] = useState("");
  const [stylists, setStylists] = useState<{ id: string; name: string }[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [pendingLeave, setPendingLeave] = useState<LeaveReq[]>([]);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ year, month });
    if (stylistId) params.set("stylistId", stylistId);
    const res = await fetch(`/api/admin/pay?${params}`);
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    const data = await res.json();
    setReports(data.reports || []);
    setPendingLeave(data.pendingLeave || []);
    setStylists(data.stylists || []);
    setPeriodStart(data.periodStart || "");
    setPeriodEnd(data.periodEnd || "");
    setLoading(false);
  }, [year, month, stylistId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function reviewLeave(stylistBlockStylistId: string, blockId: string, action: "approve" | "reject") {
    const res = await fetch(`/api/admin/stylists/${stylistBlockStylistId}/blocks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: blockId, action }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error || "Could not update leave");
      return;
    }
    setMessage(action === "approve" ? "Leave approved." : "Leave rejected.");
    await load();
  }

  async function markPaid(report: Report) {
    if (!window.confirm(`Mark $${centsToDollars(report.totalPay)} paid to ${report.stylist.name}?`)) {
      return;
    }
    const res = await fetch("/api/admin/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stylistId: report.stylist.id,
        amountCents: report.totalPay,
        periodStart,
        periodEnd,
        note: `${year}-${month} payout`,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error || "Could not save payout");
      return;
    }
    setMessage(`Marked paid for ${report.stylist.name}.`);
    await load();
  }

  return (
    <main className="space-y-8">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-[#c9a87c] uppercase">
          Payroll
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
          Pay & hours
        </h1>
        <p className="mt-2 text-muted">
          Worked time from completed bookings. Pay from hourly rate and/or commission on
          amounts charged.
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-[#c9a87c]/25 bg-[#2a211c] p-4 sm:grid-cols-3">
        <label className="grid gap-1 text-xs font-semibold tracking-wide text-[#c9a87c] uppercase">
          Year
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-sm font-normal normal-case text-[#fffaf6]"
          >
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold tracking-wide text-[#c9a87c] uppercase">
          Month
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-sm font-normal normal-case text-[#fffaf6]"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={String(m)}>
                {new Date(2000, m - 1, 1).toLocaleString("en-CA", { month: "long" })}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold tracking-wide text-[#c9a87c] uppercase">
          Stylist
          <select
            value={stylistId}
            onChange={(e) => setStylistId(e.target.value)}
            className="rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-sm font-normal normal-case text-[#fffaf6]"
          >
            <option value="">All stylists</option>
            {stylists.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {message ? <p className="text-sm text-[#f0c987]">{message}</p> : null}

      {pendingLeave.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Leave awaiting approval
          </h2>
          <div className="divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-cream">
            {pendingLeave.map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{b.stylist.name}</p>
                  <p className="text-sm text-muted">
                    {b.reason} · {new Date(b.startsAt).toLocaleString("en-CA")} →{" "}
                    {new Date(b.endsAt).toLocaleString("en-CA")}
                  </p>
                  {b.note ? <p className="text-sm text-cocoa">{b.note}</p> : null}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-solid rounded-full px-3 py-1.5 text-sm"
                    onClick={() => reviewLeave(b.stylist.id, b.id, "approve")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-[rgba(245,168,168,0.45)] px-3 py-1.5 text-sm text-[#f5a8a8]"
                    onClick={() => reviewLeave(b.stylist.id, b.id, "reject")}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {loading ? <p className="text-muted">Loading pay report…</p> : null}

      {!loading &&
        reports.map((r) => (
          <section
            key={r.stylist.id}
            className="space-y-3 rounded-2xl border border-[#c9a87c]/25 bg-[#2a211c] p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl">
                  {r.stylist.name}
                </h2>
                <p className="text-sm text-muted">
                  {r.stylist.payType}
                  {r.stylist.commissionBps != null
                    ? ` · ${(r.stylist.commissionBps / 100).toFixed(0)}% commission`
                    : ""}
                  {r.stylist.hourlyRateCents != null
                    ? ` · $${centsToDollars(r.stylist.hourlyRateCents)}/hr`
                    : ""}
                  {r.stylist.selfManageSchedule ? " · Self-manage schedule" : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-[#c9a87c]">Estimated pay</p>
                <p className="font-[family-name:var(--font-display)] text-3xl text-[#f0c987]">
                  ${centsToDollars(r.totalPay)}
                </p>
                <p className="text-xs text-muted">
                  Charged ${centsToDollars(r.chargedCentsTotal)} ·{" "}
                  {(r.workedMinutes / 60).toFixed(1)} hrs worked
                </p>
              </div>
            </div>

            <div className="divide-y divide-ink/10 rounded-xl border border-ink/10 bg-cream">
              {r.jobs.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted">No completed jobs this month.</p>
              ) : null}
              {r.jobs.map((j) => (
                <div
                  key={j.id}
                  className="grid gap-1 px-4 py-3 sm:grid-cols-[140px_1fr_auto]"
                >
                  <p className="text-sm">
                    {new Date(j.startsAt).toLocaleString("en-CA", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-sm">
                    {j.clientName} · {j.serviceName} ({j.durationMin} min)
                  </p>
                  <p className="text-sm font-medium">${centsToDollars(j.chargedCents)}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={r.totalPay <= 0}
                onClick={() => markPaid(r)}
                className="btn-solid rounded-full px-4 py-2 text-sm disabled:opacity-40"
              >
                Mark period paid
              </button>
              {r.payouts[0] ? (
                <p className="text-sm text-[#9fe3b8]">
                  Last payout ${centsToDollars(r.payouts[0].amountCents)}
                  {r.payouts[0].paidAt
                    ? ` · ${new Date(r.payouts[0].paidAt).toLocaleDateString("en-CA")}`
                    : ""}
                </p>
              ) : null}
            </div>
          </section>
        ))}
    </main>
  );
}
