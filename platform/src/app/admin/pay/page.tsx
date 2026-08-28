"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import { centsToDollars } from "@/lib/pay";
import { PromotionsSettings } from "@/components/admin/PromotionsSettings";

type Job = {
  id: string;
  startsAt: string;
  clientName: string;
  serviceName: string;
  durationMin: number;
  chargedCents: number;
  tipCents: number;
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
  tipCentsTotal: number;
  workedMinutes: number;
  hourlyPay: number;
  commissionPay: number;
  tipPay: number;
  totalPay: number;
  earnedCents: number;
  paidCents: number;
  owedCents: number;
  isPaid: boolean;
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

function csvEscape(value: string | number) {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function hourLabel(h: number) {
  if (h === 0 || h === 24) return "12:00 AM";
  if (h === 12) return "12:00 PM";
  if (h < 12) return `${h}:00 AM`;
  return `${h - 12}:00 PM`;
}

const WEEKDAYS = [
  { day: 0, label: "Sunday" },
  { day: 1, label: "Monday" },
  { day: 2, label: "Tuesday" },
  { day: 3, label: "Wednesday" },
  { day: 4, label: "Thursday" },
  { day: 5, label: "Friday" },
  { day: 6, label: "Saturday" },
] as const;

function downloadPayCsv(reports: Report[], year: string, month: string) {
  const rows: string[] = [
    [
      "Stylist",
      "Date",
      "Client",
      "Service",
      "Minutes",
      "Service charge ($)",
      "Tip ($)",
      "Pay type",
      "Hourly pay ($)",
      "Commission pay ($)",
      "Tip pay ($)",
      "Earned ($)",
      "Paid ($)",
      "Owed ($)",
    ].join(","),
  ];

  for (const r of reports) {
    if (r.jobs.length === 0) {
      rows.push(
        [
          csvEscape(r.stylist.name),
          "",
          "",
          "(no completed jobs)",
          "0",
          "0.00",
          "0.00",
          csvEscape(r.stylist.payType),
          centsToDollars(r.hourlyPay),
          centsToDollars(r.commissionPay),
          centsToDollars(r.tipPay),
          centsToDollars(r.earnedCents ?? r.totalPay),
          centsToDollars(r.paidCents ?? 0),
          centsToDollars(r.owedCents ?? r.totalPay),
        ].join(",")
      );
      continue;
    }
    for (const j of r.jobs) {
      rows.push(
        [
          csvEscape(r.stylist.name),
          csvEscape(new Date(j.startsAt).toLocaleString("en-CA")),
          csvEscape(j.clientName),
          csvEscape(j.serviceName),
          j.durationMin,
          centsToDollars(j.chargedCents),
          centsToDollars(j.tipCents),
          csvEscape(r.stylist.payType),
          "",
          "",
          centsToDollars(j.tipCents),
          "",
          "",
          "",
        ].join(",")
      );
    }
    rows.push(
      [
        csvEscape(r.stylist.name),
        "",
        "",
        "MONTH TOTAL",
        r.workedMinutes,
        centsToDollars(r.chargedCentsTotal),
        centsToDollars(r.tipCentsTotal),
        csvEscape(r.stylist.payType),
        centsToDollars(r.hourlyPay),
        centsToDollars(r.commissionPay),
        centsToDollars(r.tipPay),
        centsToDollars(r.earnedCents ?? r.totalPay),
        centsToDollars(r.paidCents ?? 0),
        centsToDollars(r.owedCents ?? r.totalPay),
      ].join(",")
    );
  }

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pay-hours-${year}-${month.padStart(2, "0")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

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
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [openHour, setOpenHour] = useState(9);
  const [closeHour, setCloseHour] = useState(18);
  const [closedDays, setClosedDays] = useState<number[]>([0]);
  const [hoursMsg, setHoursMsg] = useState("");
  const [hoursError, setHoursError] = useState("");
  const [savingHours, setSavingHours] = useState(false);
  const [taxPercent, setTaxPercent] = useState(13);
  const [taxMsg, setTaxMsg] = useState("");
  const [taxError, setTaxError] = useState("");
  const [savingTax, setSavingTax] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ year, month });
    if (stylistId) params.set("stylistId", stylistId);
    const res = await fetch(`/api/admin/pay?${params}`);
    if (res.status === 401) {
      window.location.href = "/manager/login";
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

  useEffect(() => {
    fetch("/api/admin/salon")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.salon) return;
        setOpenHour(data.salon.openHour);
        setCloseHour(data.salon.closeHour);
        setClosedDays(
          Array.isArray(data.salon.closedDays) && data.salon.closedDays.length > 0
            ? data.salon.closedDays
            : [0]
        );
        if (Number.isFinite(data.salon.taxPercent)) setTaxPercent(data.salon.taxPercent);
      });
  }, []);

  function toggleClosedDay(day: number) {
    setClosedDays((prev) => {
      if (prev.includes(day)) return prev.filter((d) => d !== day);
      return [...prev, day].sort((a, b) => a - b);
    });
  }

  async function onSaveHours(e: React.FormEvent) {
    e.preventDefault();
    setHoursError("");
    setHoursMsg("");
    if (closedDays.length >= 7) {
      setHoursError("Pick at least one open day.");
      return;
    }
    setSavingHours(true);
    const res = await fetch("/api/admin/salon", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openHour, closeHour, closedDays }),
    });
    const data = await res.json();
    setSavingHours(false);
    if (!res.ok) {
      setHoursError(data.error || "Could not save store hours");
      return;
    }
    if (data.salon?.closedDays) setClosedDays(data.salon.closedDays);
    setHoursMsg(data.message || "Store hours saved.");
  }

  async function onSaveTax(e: React.FormEvent) {
    e.preventDefault();
    setTaxError("");
    setTaxMsg("");
    const next = Math.round(Number(taxPercent));
    if (!Number.isFinite(next) || next < 0 || next > 50) {
      setTaxError("Enter a tax rate between 0 and 50.");
      return;
    }
    setSavingTax(true);
    const res = await fetch("/api/admin/salon", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taxPercent: next }),
    });
    const data = await res.json();
    setSavingTax(false);
    if (!res.ok) {
      setTaxError(data.error || "Could not save sales tax");
      return;
    }
    if (Number.isFinite(data.salon?.taxPercent)) setTaxPercent(data.salon.taxPercent);
    setTaxMsg(data.message || "Sales tax saved.");
  }

  async function reviewLeave(
    stylistBlockStylistId: string,
    blockId: string,
    status: "APPROVED" | "REJECTED"
  ) {
    const res = await fetch(`/api/admin/stylists/${stylistBlockStylistId}/blocks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ id: blockId, status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error || "Could not update leave");
      return;
    }
    if (data.block?.status !== status) {
      setMessage("Could not update leave status. Try again.");
      await load();
      return;
    }
    setMessage(status === "APPROVED" ? "Leave approved." : "Leave rejected.");
    await load();
  }

  async function markPaid(report: Report) {
    const amount = report.owedCents ?? report.totalPay;
    if (amount <= 0) {
      setMessage("Nothing left to pay for this period.");
      return;
    }
    const ok = await confirm({
      title: "Mark payout paid?",
      message: `Mark $${centsToDollars(amount)} paid to ${report.stylist.name}?`,
      confirmLabel: "Mark paid",
      cancelLabel: "Cancel",
      tone: "default",
    });
    if (!ok) {
      return;
    }
    const res = await fetch("/api/admin/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stylistId: report.stylist.id,
        amountCents: amount,
        periodStart,
        periodEnd,
        note: `${year}-${month} payout`,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error || "Could not save payout");
      return;
    }
    setMessage(`Marked paid for ${report.stylist.name}.`);
    await load();
  }

  return (
    <main className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#7d6154] uppercase">
            Money
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
            Payroll
          </h1>
          <p className="mt-2 text-muted">
            Set store defaults for new stylists, review leave, and calculate monthly pay.
            Hourly pay uses scheduled hours minus approved leave. Commission is on service
            charges; tips go 100% to the stylist. Voided jobs are excluded from commission and
            tips.
          </p>
        </div>
        <button
          type="button"
          disabled={loading || reports.length === 0}
          onClick={() => downloadPayCsv(reports, year, month)}
          className="rounded-full border border-[#7d6154]/45 px-4 py-2 text-sm text-[#7d6154] disabled:opacity-40"
        >
          Download CSV
        </button>
      </div>

      <form
        onSubmit={onSaveHours}
        className="grid gap-4 rounded-2xl border border-[#7d6154]/30 bg-[#ffffff] p-5"
        data-testid="store-hours-form"
      >
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[#2b2521]">
            Store regular hours
          </h2>
          <p className="mt-1 text-sm text-[#6b5b52]">
            Default open/close and off days for new stylists. Existing stylist schedules stay as
            set.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm text-[#6b5b52]">
            Opens
            <select
              value={openHour}
              onChange={(e) => setOpenHour(Number(e.target.value))}
              aria-label="Store open hour"
              className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-[#2b2521]"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm text-[#6b5b52]">
            Closes
            <select
              value={closeHour}
              onChange={(e) => setCloseHour(Number(e.target.value))}
              aria-label="Store close hour"
              className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-[#2b2521]"
            >
              {Array.from({ length: 24 }, (_, i) => {
                const h = i + 1;
                return (
                  <option key={h} value={h}>
                    {hourLabel(h)}
                  </option>
                );
              })}
            </select>
          </label>
        </div>
        <fieldset>
          <legend className="text-sm text-[#6b5b52]">Store off days</legend>
          <p className="mt-1 text-xs text-[#6b5b52]/80">
            Days the store is closed. New stylists inherit these as days off.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {WEEKDAYS.map(({ day, label }) => {
              const checked = closedDays.includes(day);
              return (
                <label
                  key={day}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${
                    checked
                      ? "border-[#7d6154] bg-[#7d6154]/15 text-[#7d6154]"
                      : "border-[#7d6154]/30 text-[#6b5b52]"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => toggleClosedDay(day)}
                    aria-label={`${label} off`}
                  />
                  {label}
                </label>
              );
            })}
          </div>
        </fieldset>
        {hoursError ? <p className="text-sm text-[#f5a8a8]">{hoursError}</p> : null}
        {hoursMsg ? <p className="text-sm text-[#9fe3b8]">{hoursMsg}</p> : null}
        <button
          type="submit"
          disabled={savingHours}
          className="btn-solid rounded-full px-5 py-3"
        >
          {savingHours ? "Saving…" : "Save store hours"}
        </button>
      </form>

      <form
        onSubmit={onSaveTax}
        className="grid gap-4 rounded-2xl border border-[#7d6154]/30 bg-[#ffffff] p-5"
        data-testid="store-tax-form"
      >
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[#2b2521]">
            Sales tax
          </h2>
          <p className="mt-1 text-sm text-[#6b5b52]">
            Added on services and products at checkout. Tips are not taxed. Ontario HST is 13%.
          </p>
        </div>
        <label className="grid max-w-xs gap-1.5 text-sm text-[#6b5b52]">
          Tax rate
          <span className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={50}
              step={1}
              value={taxPercent}
              onChange={(e) => setTaxPercent(Number(e.target.value))}
              aria-label="Sales tax percent"
              className="w-full rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-[#2b2521]"
            />
            <span className="shrink-0 text-[#2b2521]">%</span>
          </span>
        </label>
        {taxError ? <p className="text-sm text-[#f5a8a8]">{taxError}</p> : null}
        {taxMsg ? <p className="text-sm text-[#9fe3b8]">{taxMsg}</p> : null}
        <button type="submit" disabled={savingTax} className="btn-solid rounded-full px-5 py-3">
          {savingTax ? "Saving…" : "Save sales tax"}
        </button>
      </form>

      <PromotionsSettings />

      <div className="grid gap-3 rounded-2xl border border-[#7d6154]/25 bg-[#ffffff] p-4 sm:grid-cols-3">
        <label className="grid gap-1 text-xs font-semibold tracking-wide text-[#7d6154] uppercase">
          Year
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-sm font-normal normal-case text-[#2b2521]"
          >
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold tracking-wide text-[#7d6154] uppercase">
          Month
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-sm font-normal normal-case text-[#2b2521]"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={String(m)}>
                {new Date(2000, m - 1, 1).toLocaleString("en-CA", { month: "long" })}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold tracking-wide text-[#7d6154] uppercase">
          Stylist
          <select
            value={stylistId}
            onChange={(e) => setStylistId(e.target.value)}
            className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-sm font-normal normal-case text-[#2b2521]"
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

      {message ? <p className="text-sm text-[#7d6154]">{message}</p> : null}

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
                  <p className="text-sm text-[#7d6154]">Leave request from</p>
                  <p className="font-medium text-[#2b2521]">{b.stylist.name}</p>
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
                    onClick={() => reviewLeave(b.stylist.id, b.id, "APPROVED")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-[rgba(245,168,168,0.45)] px-3 py-1.5 text-sm text-[#f5a8a8]"
                    onClick={() => reviewLeave(b.stylist.id, b.id, "REJECTED")}
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
            className="space-y-3 rounded-2xl border border-[#7d6154]/25 bg-[#ffffff] p-5"
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
                <p className="text-sm text-[#7d6154]">Amount owed</p>
                <p
                  className={`font-[family-name:var(--font-display)] text-3xl ${
                    (r.owedCents ?? r.totalPay) <= 0 ? "text-[#9fe3b8]" : "text-[#7d6154]"
                  }`}
                >
                  ${centsToDollars(r.owedCents ?? r.totalPay)}
                </p>
                <p className="text-xs text-muted">
                  Earned ${centsToDollars(r.earnedCents ?? r.totalPay)}
                  {(r.paidCents ?? 0) > 0
                    ? ` · Paid $${centsToDollars(r.paidCents)}`
                    : ""}
                </p>
                <p className="text-xs text-muted">
                  Charged ${centsToDollars(r.chargedCentsTotal)}
                  {r.tipCentsTotal > 0
                    ? ` · Tips $${centsToDollars(r.tipCentsTotal)}`
                    : ""}{" "}
                  · {(r.workedMinutes / 60).toFixed(1)} hrs worked
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
                  <div className="text-right text-sm">
                    <p className="font-medium">${centsToDollars(j.chargedCents)}</p>
                    {j.tipCents > 0 ? (
                      <p className="text-xs text-[#9fe3b8]">+${centsToDollars(j.tipCents)} tip</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {(r.owedCents ?? r.totalPay) > 0 ? (
                <button
                  type="button"
                  onClick={() => markPaid(r)}
                  className="btn-solid rounded-full px-4 py-2 text-sm"
                >
                  Mark period paid
                </button>
              ) : (r.earnedCents ?? r.totalPay) > 0 ? (
                <p className="rounded-full border border-[#9fe3b8]/40 px-4 py-2 text-sm font-semibold text-[#9fe3b8]">
                  Paid in full
                </p>
              ) : (
                <button
                  type="button"
                  disabled
                  className="btn-solid rounded-full px-4 py-2 text-sm disabled:opacity-40"
                >
                  Mark period paid
                </button>
              )}
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
