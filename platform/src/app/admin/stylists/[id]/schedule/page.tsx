"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ToggleSwitch } from "@/components/ToggleSwitch";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type WeekHour = {
  dayOfWeek: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  isOff: boolean;
};

type Block = {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  note: string | null;
  status?: string;
};

function hourOptions() {
  return Array.from({ length: 24 }, (_, h) => h);
}

/** Format Date for <input type="datetime-local"> in local timezone */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function StylistSchedulePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [name, setName] = useState("");
  const [weekHours, setWeekHours] = useState<WeekHour[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("LEAVE");
  const [leaveNote, setLeaveNote] = useState("");

  async function load() {
    const res = await fetch(`/api/admin/stylists/${id}/schedule`);
    if (res.status === 401) {
      window.location.href = "/manager/login";
      return;
    }
    const text = await res.text();
    let data: {
      stylist?: { name?: string };
      weekHours?: WeekHour[];
      blocks?: Block[];
      error?: string;
    } = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      setMessage("Could not load schedule. Refresh the page or restart the server.");
      return;
    }
    if (!res.ok) {
      setMessage(data.error || "Could not load schedule");
      return;
    }
    setName(data.stylist?.name || "");
    setWeekHours(data.weekHours || []);
    setBlocks(data.blocks || []);
  }

  useEffect(() => {
    load();
  }, [id]);

  function updateDay(dayOfWeek: number, patch: Partial<WeekHour>) {
    setWeekHours((rows) => {
      const next = rows.map((r) => (r.dayOfWeek === dayOfWeek ? { ...r, ...patch } : r));
      void persistHours(next);
      return next;
    });
  }

  async function persistHours(rows: WeekHour[]) {
    setSaving(true);
    setMessage("");
    const res = await fetch(`/api/admin/stylists/${id}/schedule`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekHours: rows }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    setMessage(
      res.ok
        ? "Weekly hours saved. Clients will only see open slots."
        : data.error || "Save failed"
    );
  }

  async function saveHours(e: React.FormEvent) {
    e.preventDefault();
    await persistHours(weekHours);
  }

  function startEdit(b: Block) {
    setEditingId(b.id);
    setLeaveStart(toLocalInput(b.startsAt));
    setLeaveEnd(toLocalInput(b.endsAt));
    setLeaveReason(b.reason);
    setLeaveNote(b.note || "");
    setMessage("Editing this block — fix the times and save.");
  }

  function cancelEdit() {
    setEditingId(null);
    setLeaveStart("");
    setLeaveEnd("");
    setLeaveReason("LEAVE");
    setLeaveNote("");
    setMessage("");
  }

  async function saveLeave(e: React.FormEvent) {
    e.preventDefault();
    const startsAt = leaveStart ? new Date(leaveStart).toISOString() : "";
    const endsAt = leaveEnd ? new Date(leaveEnd).toISOString() : "";
    if (!startsAt || !endsAt || !(new Date(startsAt) < new Date(endsAt))) {
      setMessage("Choose a valid start and end time (end must be after start).");
      return;
    }
    const res = await fetch(`/api/admin/stylists/${id}/blocks`, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingId || undefined,
        startsAt,
        endsAt,
        reason: leaveReason,
        note: leaveNote,
      }),
    });
    const text = await res.text();
    let data: { error?: string } = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      /* ignore */
    }
    if (!res.ok) {
      setMessage(data.error || "Could not save leave / break");
      return;
    }
    const wasEdit = Boolean(editingId);
    cancelEdit();
    setMessage(
      wasEdit
        ? "Break / leave updated."
        : "Leave / block added — those times are hidden from booking."
    );
    await load();
  }

  async function removeBlock(blockId: string) {
    await fetch(`/api/admin/stylists/${id}/blocks?blockId=${blockId}`, {
      method: "DELETE",
    });
    await load();
  }

  return (
    <main className="space-y-10">
      <div>
        <Link href="/manager/stylists" className="text-sm text-muted hover:text-ink">
          ← Back to stylists
        </Link>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
          {name ? `${name}'s schedule` : "Stylist schedule"}
        </h1>
        <p className="mt-2 text-muted">
          Set weekly working hours and leave. Online booking only shows times that are open and not
          blocked.
        </p>
      </div>

      {message && <p className="text-sm text-cocoa">{message}</p>}

      <form onSubmit={saveHours} className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Weekly hours</h2>
        <div className="divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-cream">
          {weekHours.map((row) => (
            <div
              key={row.dayOfWeek}
              className="grid items-center gap-3 px-4 py-3 sm:grid-cols-[140px_1fr_auto]"
            >
              <label className="flex cursor-pointer items-center justify-between gap-3 font-medium sm:justify-start">
                <span>{DAY_NAMES[row.dayOfWeek]}</span>
                <ToggleSwitch
                  checked={!row.isOff}
                  onChange={(open) => updateDay(row.dayOfWeek, { isOff: !open })}
                  ariaLabel={`${DAY_NAMES[row.dayOfWeek]} open for bookings`}
                />
              </label>
              {row.isOff ? (
                <p className="text-sm text-muted">Day off — no online slots</p>
              ) : (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <select
                    value={row.startHour}
                    onChange={(e) =>
                      updateDay(row.dayOfWeek, { startHour: Number(e.target.value) })
                    }
                    className="rounded-lg border border-ink/15 bg-white px-2 py-1 text-ink"
                  >
                    {hourOptions().map((h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                  <span>to</span>
                  <select
                    value={row.endHour}
                    onChange={(e) =>
                      updateDay(row.dayOfWeek, { endHour: Number(e.target.value) })
                    }
                    className="rounded-lg border border-ink/15 bg-white px-2 py-1 text-ink"
                  >
                    {hourOptions().map((h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
        <button type="submit" disabled={saving} className="btn-solid rounded-full px-5 py-2">
          {saving ? "Saving…" : "Save weekly hours"}
        </button>
      </form>

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Leave & blocked time</h2>
        <p className="text-sm text-muted">
          Vacation, sick day, lunch, training — clients cannot book these times.
        </p>

        <form
          onSubmit={saveLeave}
          className="grid gap-3 rounded-2xl border border-ink/10 bg-cream p-4 sm:grid-cols-2"
        >
          {editingId && (
            <p className="text-sm text-cocoa sm:col-span-2">
              Editing an existing break / leave. Change AM/PM times below, then save.
            </p>
          )}
          <label className="grid gap-1 text-sm">
            Starts
            <input
              required
              type="datetime-local"
              value={leaveStart}
              onChange={(e) => setLeaveStart(e.target.value)}
              className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Ends
            <input
              required
              type="datetime-local"
              value={leaveEnd}
              onChange={(e) => setLeaveEnd(e.target.value)}
              className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Type
            <select
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink"
            >
              <option value="LEAVE">Leave / vacation</option>
              <option value="BREAK">Break</option>
              <option value="BLOCKED">Blocked</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Note (optional)
            <input
              value={leaveNote}
              onChange={(e) => setLeaveNote(e.target.value)}
              className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink"
            />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button type="submit" className="btn-solid rounded-full px-5 py-2">
              {editingId ? "Save changes" : "Add leave / block"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-full border border-ink/20 px-5 py-2 text-sm"
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>

        <div className="divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-cream">
          {blocks.length === 0 && (
            <p className="px-4 py-6 text-sm text-muted">No upcoming leave or blocks.</p>
          )}
          {blocks.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium uppercase tracking-wide text-cocoa text-xs">
                  {b.reason}
                  {b.status ? ` · ${b.status}` : ""}
                </p>
                <p className="text-sm">
                  {new Date(b.startsAt).toLocaleString("en-CA")} →{" "}
                  {new Date(b.endsAt).toLocaleString("en-CA")}
                </p>
                {b.note && <p className="text-sm text-muted">{b.note}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {b.status === "PENDING" ? (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/admin/stylists/${id}/blocks`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: b.id, status: "APPROVED" }),
                        });
                        setMessage("Leave approved.");
                        load();
                      }}
                      className="btn-solid rounded-full px-3 py-1 text-sm"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/admin/stylists/${id}/blocks`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: b.id, status: "REJECTED" }),
                        });
                        setMessage("Leave rejected.");
                        load();
                      }}
                      className="rounded-full border border-[rgba(245,168,168,0.45)] px-3 py-1 text-sm text-[#f5a8a8]"
                    >
                      Reject
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => startEdit(b)}
                  className="rounded-full border border-ink/20 px-3 py-1 text-sm"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => removeBlock(b.id)}
                  className="rounded-full border border-ink/20 px-3 py-1 text-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
