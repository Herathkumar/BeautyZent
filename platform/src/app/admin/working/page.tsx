"use client";

import { useCallback, useEffect, useState } from "react";
import { sourceLabel } from "@/lib/appointment-source";

type Absence = {
  id: string;
  reasonLabel: string;
  note: string | null;
  status: string;
  startLabel: string;
  endLabel: string;
  coversFullDay: boolean;
};

type RosterRow = {
  id: string;
  name: string;
  status: "WORKING" | "PARTIAL" | "AWAY" | "OFF";
  summary: string;
  scheduled: { startLabel: string; endLabel: string } | null;
  onFloor: { startLabel: string; endLabel: string }[];
  assignedJobs: number;
  availableMinutes: number;
  availableLabel: string;
  absences: Absence[];
};

type Job = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  source: string;
  notes: string | null;
  client: { name: string; phone: string | null };
  service: { name: string };
};

function jobsLabel(n: number) {
  return n === 1 ? "1 job" : `${n} jobs`;
}

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
    case "CHECKED_IN":
      return "text-[#9fe3b8]";
    case "COMPLETED":
      return "text-[#9fe3b8]/80";
    case "CANCELLED":
    case "NO_SHOW":
      return "text-[#f5a8a8]";
    default:
      return "text-[#f0c987]";
  }
}

function formatJobTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

type Payload = {
  date: string;
  today: string;
  weekdayLabel: string;
  timeZone?: string;
  counts: { working: number; away: number; off: number; total: number };
  roster: RosterRow[];
};

function statusStyles(status: RosterRow["status"]) {
  switch (status) {
    case "WORKING":
      return {
        badge: "bg-[rgba(159,227,184,0.18)] text-[#9fe3b8]",
        label: "On floor",
      };
    case "PARTIAL":
      return {
        badge: "bg-[rgba(240,201,135,0.18)] text-[#f0c987]",
        label: "Partial day",
      };
    case "AWAY":
      return {
        badge: "bg-[rgba(245,168,168,0.15)] text-[#f5a8a8]",
        label: "Away",
      };
    default:
      return {
        badge: "bg-[rgba(201,168,124,0.12)] text-[#c9a87c]",
        label: "Day off",
      };
  }
}

export default function WhoIsWorkingPage() {
  const [date, setDate] = useState("");
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState("");
  const [timeZone, setTimeZone] = useState("America/Toronto");

  const load = useCallback(async (ymd?: string) => {
    setLoading(true);
    setError("");
    const q = ymd ? `?date=${ymd}` : "";
    const res = await fetch(`/api/admin/who-is-working${q}`, { cache: "no-store" });
    if (res.status === 401) {
      window.location.href = "/manager/login";
      return;
    }
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Could not load roster");
      setLoading(false);
      return;
    }
    setData(json);
    setDate(json.date);
    if (json.timeZone) setTimeZone(json.timeZone);
    setLoading(false);
  }, []);

  const loadJobs = useCallback(async (stylistId: string, day: string) => {
    setJobsLoading(true);
    setJobsError("");
    const params = new URLSearchParams({ stylistId, day });
    const res = await fetch(`/api/admin/appointments?${params}`, { cache: "no-store" });
    if (res.status === 401) {
      window.location.href = "/manager/login";
      return;
    }
    const json = await res.json();
    if (!res.ok) {
      setJobsError(json.error || "Could not load jobs");
      setJobs([]);
      setJobsLoading(false);
      return;
    }
    setJobs(json.appointments || []);
    if (json.timeZone) setTimeZone(json.timeZone);
    setJobsLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("stylist");
    if (fromUrl) setSelectedId(fromUrl);
  }, []);

  useEffect(() => {
    if (!selectedId || !date) {
      setJobs([]);
      return;
    }
    void loadJobs(selectedId, date);
  }, [selectedId, date, loadJobs]);

  function shiftDay(delta: number) {
    if (!date) return;
    const [y, m, d] = date.split("-").map(Number);
    const dt = new Date(y!, m! - 1, d! + delta);
    const next = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    setDate(next);
    void load(next);
  }

  function toggleStylist(id: string) {
    setSelectedId((cur) => (cur === id ? null : id));
  }

  return (
    <main className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-[#c9a87c] uppercase">
          Floor roster
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#fffaf6]">
          Who&apos;s working
        </h1>
        <p className="mt-2 text-muted">
          Pick a day, then tap a stylist to see their jobs for that day.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#c9a87c]/25 bg-[#2a211c] p-4">
        <button
          type="button"
          className="rounded-full border border-[#c9a87c]/40 px-3 py-2 text-[#f0c987]"
          aria-label="Previous day"
          onClick={() => shiftDay(-1)}
        >
          ‹
        </button>
        <label className="grid min-w-[11rem] flex-1 gap-1 text-xs font-semibold tracking-wide text-[#c9a87c] uppercase">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              void load(e.target.value);
            }}
            className="rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-sm font-normal normal-case text-[#fffaf6]"
          />
        </label>
        <button
          type="button"
          className="rounded-full border border-[#c9a87c]/40 px-3 py-2 text-[#f0c987]"
          aria-label="Next day"
          onClick={() => shiftDay(1)}
        >
          ›
        </button>
        {data && date !== data.today ? (
          <button
            type="button"
            className="rounded-full border border-[#c9a87c]/40 px-4 py-2 text-sm text-[#f0c987]"
            onClick={() => void load(data.today)}
          >
            Today
          </button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-[#f5a8a8]">{error}</p> : null}

      {data ? (
        <>
          <div>
            <p className="font-[family-name:var(--font-display)] text-2xl text-[#fffaf6]">
              {data.weekdayLabel}
            </p>
            <p className="mt-1 text-sm text-muted">
              {data.counts.working} on floor · {data.counts.away} away · {data.counts.off} day off
            </p>
          </div>

          {loading ? <p className="text-sm text-muted">Updating…</p> : null}

          <div className="space-y-3">
            {data.roster.map((row) => {
              const s = statusStyles(row.status);
              const open = selectedId === row.id;
              return (
                <article
                  key={row.id}
                  className={`rounded-2xl border bg-[#2a211c] p-4 transition ${
                    open
                      ? "border-[#f0c987]/55 shadow-[0_0_0_1px_rgba(240,201,135,0.2)]"
                      : "border-[#c9a87c]/25 hover:border-[#c9a87c]/45"
                  }`}
                  data-testid="working-roster-row"
                  data-stylist-id={row.id}
                >
                  <button
                    type="button"
                    className="flex w-full flex-wrap items-start justify-between gap-3 text-left"
                    onClick={() => toggleStylist(row.id)}
                    aria-expanded={open}
                    data-testid="working-stylist-toggle"
                  >
                    <div>
                      <h2 className="font-[family-name:var(--font-display)] text-xl text-[#fffaf6]">
                        {row.name}
                      </h2>
                      <p className="mt-1 text-sm text-[#f0c987]">{row.summary}</p>
                      {row.status === "WORKING" || row.status === "PARTIAL" ? (
                        <p className="mt-1 text-sm text-muted">
                          {jobsLabel(row.assignedJobs ?? 0)}
                          <span className="text-white/25"> · </span>
                          {row.availableLabel || "No open time"}
                        </p>
                      ) : row.assignedJobs > 0 ? (
                        <p className="mt-1 text-sm text-muted">
                          {jobsLabel(row.assignedJobs)} assigned
                        </p>
                      ) : null}
                      {row.scheduled && row.status !== "OFF" ? (
                        <p className="mt-1 text-xs text-muted">
                          Scheduled {row.scheduled.startLabel} – {row.scheduled.endLabel}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-[#c9a87c]">
                        {open ? "Hide jobs" : "View jobs"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${s.badge}`}
                    >
                      {s.label}
                    </span>
                  </button>

                  {row.onFloor.length > 0 && row.status === "PARTIAL" ? (
                    <div className="mt-3">
                      <p className="text-[10px] font-semibold tracking-wide text-[#9fe3b8] uppercase">
                        On floor
                      </p>
                      <ul className="mt-1 space-y-1 text-sm text-[#fffaf6]">
                        {row.onFloor.map((seg, i) => (
                          <li key={`${row.id}-floor-${i}`}>
                            {seg.startLabel} – {seg.endLabel}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {row.absences.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-[10px] font-semibold tracking-wide text-[#f5a8a8] uppercase">
                        Away / breaks
                      </p>
                      <ul className="mt-1 space-y-2">
                        {row.absences.map((a) => (
                          <li key={a.id} className="text-sm">
                            <span className="font-medium text-[#fffaf6]">
                              {a.reasonLabel}
                              {a.status === "PENDING" ? " (pending approval)" : ""}
                            </span>
                            <span className="text-muted">
                              {" "}
                              · {a.startLabel} – {a.endLabel}
                              {a.coversFullDay ? " · full day" : ""}
                            </span>
                            {a.note ? (
                              <span className="block text-[#c9a87c]">{a.note}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {open ? (
                    <div
                      className="mt-4 border-t border-[#c9a87c]/20 pt-4"
                      data-testid="working-jobs-breakdown"
                    >
                      <p className="text-[10px] font-semibold tracking-wide text-[#c9a87c] uppercase">
                        Jobs · {date}
                      </p>
                      {jobsLoading ? (
                        <p className="mt-2 text-sm text-muted">Loading jobs…</p>
                      ) : null}
                      {jobsError ? (
                        <p className="mt-2 text-sm text-[#f5a8a8]">{jobsError}</p>
                      ) : null}
                      {!jobsLoading && !jobsError && jobs.length === 0 ? (
                        <p className="mt-2 text-sm text-muted">No jobs for this day.</p>
                      ) : null}
                      {!jobsLoading && jobs.length > 0 ? (
                        <ul className="mt-3 space-y-2">
                          {jobs.map((job) => (
                            <li
                              key={job.id}
                              className="rounded-xl border border-[#c9a87c]/20 bg-[#1c1714]/70 px-3 py-2.5"
                              data-testid="working-job-row"
                            >
                              <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <p className="font-semibold text-[#fffaf6]">
                                  {formatJobTime(job.startsAt, timeZone)}
                                  <span className="font-normal text-muted">
                                    {" "}
                                    – {formatJobTime(job.endsAt, timeZone)}
                                  </span>
                                </p>
                                <p className={`text-xs font-semibold ${statusClass(job.status)}`}>
                                  {statusLabel(job.status)}
                                </p>
                              </div>
                              <p className="mt-1 text-sm text-[#fffaf6]">
                                {job.client.name}
                                <span className="text-muted"> · {job.service.name}</span>
                              </p>
                              <p className="mt-0.5 text-xs text-[#c9a87c]">
                                {sourceLabel(job.source)}
                                {job.client.phone ? ` · ${job.client.phone}` : ""}
                              </p>
                              {job.notes ? (
                                <p className="mt-1 text-xs text-muted">Note: {job.notes}</p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </>
      ) : loading ? (
        <p className="py-10 text-center text-muted">Loading roster…</p>
      ) : null}
    </main>
  );
}
