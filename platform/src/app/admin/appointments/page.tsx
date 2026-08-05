"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { sourceLabel } from "@/lib/appointment-source";

type Appt = {
  id: string;
  startsAt: string;
  status: string;
  source: string;
  notes: string | null;
  calendarSyncedAt: string | null;
  client: { name: string; phone: string | null };
  service: { name: string };
  stylist: { id: string; name: string };
};

type StylistOpt = { id: string; name: string };

function statusLabel(status: string) {
  switch (status) {
    case "BOOKED":
      return "Booked";
    case "CHECKED_IN":
      return "Checked in";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    case "NO_SHOW":
      return "No show";
    default:
      return status;
  }
}

function statusClass(status: string) {
  switch (status) {
    case "NO_SHOW":
      return "text-[#f5a8a8]";
    case "COMPLETED":
      return "text-[#9fe3b8]";
    case "CANCELLED":
      return "text-[#a89a8c]";
    case "CHECKED_IN":
      return "text-[#f0c987]";
    default:
      return "text-muted";
  }
}

export default function AppointmentsAdminPage() {
  const now = useMemo(() => new Date(), []);
  const defaultYear = now.getFullYear();

  const [appointments, setAppointments] = useState<Appt[]>([]);
  const [stylists, setStylists] = useState<StylistOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const [stylistId, setStylistId] = useState("");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    const params = new URLSearchParams();
    if (stylistId) params.set("stylistId", stylistId);
    if (status && status !== "all") params.set("status", status);
    if (source && source !== "all") params.set("source", source);
    if (day) params.set("day", day);
    else {
      if (year) params.set("year", year);
      if (month) params.set("month", month);
    }
    if (!day && !year && !month && status !== "no_show") {
      params.set("days", "14");
    }

    const res = await fetch(`/api/admin/appointments?${params.toString()}`);
    if (res.status === 401) {
      window.location.href = "/manager/login";
      return;
    }
    const data = await res.json();
    setAppointments(data.appointments || []);
    setStylists(data.stylists || []);
    if (data.autoNoShows > 0) {
      setMessage(`${data.autoNoShows} past open booking(s) marked no-show.`);
    }
    setLoading(false);
  }, [stylistId, status, source, year, month, day]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markNoShow(id: string) {
    if (!window.confirm("Mark this booking as no-show?")) return;
    setBusyId(id);
    const res = await fetch("/api/admin/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "NO_SHOW" }),
    });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error || "Could not update booking");
      return;
    }
    await load();
  }

  const years = [defaultYear - 1, defaultYear, defaultYear + 1];
  const rangeHint = day
    ? `Day ${day}`
    : year && month
      ? `${month}/${year}`
      : year
        ? `Year ${year}`
        : status === "no_show"
          ? "No-shows (past ~90 days)"
          : "Next 14 days";

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Bookings</h1>
          <p className="text-muted">{rangeHint} across stylists.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/manager/display"
            className="btn-solid rounded-full px-4 py-2.5 text-sm"
            data-testid="bookings-store-display"
          >
            Store display
          </Link>
          <Link
            href="/manager/walk-in"
            className="rounded-full border border-[#c9a87c]/45 px-4 py-2.5 text-sm text-[#f0c987]"
          >
            Add walk-in
          </Link>
          <Link
            href="/manager/book"
            className="rounded-full border border-[#c9a87c]/45 px-4 py-2.5 text-sm text-[#f0c987]"
          >
            Book for client
          </Link>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-[#c9a87c]/25 bg-[#2a211c] p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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

        <label className="grid gap-1 text-xs font-semibold tracking-wide text-[#c9a87c] uppercase">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-sm font-normal normal-case text-[#fffaf6]"
          >
            <option value="all">All</option>
            <option value="open">Open (booked / checked in)</option>
            <option value="no_show">No shows</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <label className="grid gap-1 text-xs font-semibold tracking-wide text-[#c9a87c] uppercase">
          Source
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            aria-label="Source"
            className="rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-sm font-normal normal-case text-[#fffaf6]"
          >
            <option value="all">All sources</option>
            <option value="WALK_IN">Walk-in</option>
            <option value="ONLINE">Online</option>
            <option value="ADMIN">Front desk</option>
            <option value="PHONE">Phone</option>
          </select>
        </label>

        <label className="grid gap-1 text-xs font-semibold tracking-wide text-[#c9a87c] uppercase">
          Year
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            disabled={Boolean(day)}
            className="rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-sm font-normal normal-case text-[#fffaf6] disabled:opacity-50"
          >
            <option value="">Default range</option>
            {years.map((y) => (
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
            disabled={Boolean(day) || !year}
            className="rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-sm font-normal normal-case text-[#fffaf6] disabled:opacity-50"
          >
            <option value="">All months</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={String(m)}>
                {new Date(2000, m - 1, 1).toLocaleString("en-CA", { month: "long" })}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs font-semibold tracking-wide text-[#c9a87c] uppercase">
          Day
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            onClick={(e) => {
              try {
                e.currentTarget.showPicker?.();
              } catch {
                /* native calendar icon still works */
              }
            }}
            className="admin-date-input w-full rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-sm font-normal normal-case text-[#fffaf6]"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setStylistId("");
            setStatus("all");
            setSource("all");
            setYear("");
            setMonth("");
            setDay("");
          }}
          className="rounded-full border border-[#c9a87c]/40 px-3 py-1.5 text-sm text-[#f0c987]"
        >
          Reset filters
        </button>
        {message ? <p className="text-sm text-[#f0c987]">{message}</p> : null}
      </div>

      <div className="divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-cream">
        {loading ? (
          <p className="px-4 py-8 text-muted">Loading bookings…</p>
        ) : null}
        {!loading && appointments.length === 0 ? (
          <p className="px-4 py-8 text-muted">No bookings match these filters.</p>
        ) : null}
        {appointments.map((a) => {
          const open = a.status === "BOOKED" || a.status === "CHECKED_IN";
          return (
            <div
              key={a.id}
              className="grid gap-2 px-4 py-3 sm:grid-cols-[180px_1fr_auto] sm:items-center"
            >
              <div>
                <p className="font-medium">
                  {new Date(a.startsAt).toLocaleString("en-CA", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                <p className={`text-xs uppercase ${statusClass(a.status)}`}>
                  {statusLabel(a.status)}
                </p>
                {a.source === "WALK_IN" ? (
                  <span
                    data-testid="walk-in-badge"
                    className="mt-1 inline-block rounded-full bg-[rgba(240,201,135,0.18)] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#f0c987] uppercase"
                  >
                    Walk-in
                  </span>
                ) : (
                  <p className="mt-1 text-[10px] tracking-wide text-muted uppercase">
                    {sourceLabel(a.source)}
                  </p>
                )}
              </div>
              <div>
                <p className="font-medium">{a.client.name}</p>
                <p className="text-sm text-muted">
                  {a.service.name} with {a.stylist.name}
                  {a.client.phone ? ` · ${a.client.phone}` : ""}
                </p>
                {a.notes ? (
                  <p className="mt-1 text-sm text-cocoa">
                    <span className="font-semibold">Note:</span> {a.notes}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                <p className="text-xs text-muted">
                  {a.calendarSyncedAt ? "Calendar synced" : "Calendar pending"}
                </p>
                {open ? (
                  <button
                    type="button"
                    disabled={busyId === a.id}
                    onClick={() => markNoShow(a.id)}
                    className="rounded-full border border-[rgba(245,168,168,0.45)] px-3 py-1.5 text-xs font-semibold text-[#f5a8a8] hover:bg-[rgba(245,168,168,0.08)]"
                  >
                    {busyId === a.id ? "Saving…" : "Mark no-show"}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
