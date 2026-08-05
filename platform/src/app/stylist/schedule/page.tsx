"use client";

import { useEffect, useState } from "react";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function toLocalInput(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function reasonLabel(reason: string) {
  switch (reason) {
    case "LEAVE":
      return "Away / vacation";
    case "BREAK":
      return "Break";
    case "BLOCKED":
      return "Blocked";
    default:
      return "Other";
  }
}

function statusLabel(status?: string) {
  switch (String(status || "").toUpperCase()) {
    case "PENDING":
      return "Awaiting approval";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    default:
      return status || "";
  }
}

function statusClass(status?: string) {
  switch (String(status || "").toUpperCase()) {
    case "PENDING":
      return "text-[#b5ebe0]";
    case "APPROVED":
      return "text-[#9fe3b8]";
    case "REJECTED":
      return "text-[#f5a8a8]";
    default:
      return "text-champagne";
  }
}

export default function StylistOwnSchedulePage() {
  const [stylistId, setStylistId] = useState("");
  const [selfManage, setSelfManage] = useState(false);
  const [weekHours, setWeekHours] = useState<WeekHour[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("LEAVE");
  const [leaveNote, setLeaveNote] = useState("");

  async function bootstrap() {
    const me = await fetch("/api/stylist/me");
    if (me.status === 401) {
      window.location.href = "/stylist/login";
      return;
    }
    const meData = await me.json();
    const id = meData.stylist?.id as string;
    setStylistId(id);
    await loadSchedule(id);
  }

  async function loadSchedule(id: string) {
    const res = await fetch(`/api/admin/stylists/${id}/schedule`);
    const text = await res.text();
    let data: {
      weekHours?: WeekHour[];
      blocks?: Block[];
      stylist?: { selfManageSchedule?: boolean };
      error?: string;
    } = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      setMessage("Could not load. Close and open the app again.");
      return;
    }
    if (!res.ok) {
      setMessage(data.error || "Could not load");
      return;
    }
    setWeekHours(data.weekHours || []);
    setBlocks(data.blocks || []);
    setSelfManage(Boolean(data.stylist?.selfManageSchedule));
  }

  useEffect(() => {
    bootstrap();
  }, []);

  function updateDay(dayOfWeek: number, patch: Partial<WeekHour>) {
    setWeekHours((rows) =>
      rows.map((r) => (r.dayOfWeek === dayOfWeek ? { ...r, ...patch } : r))
    );
  }

  async function saveHours(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/admin/stylists/${stylistId}/schedule`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekHours }),
    });
    setMessage(res.ok ? "Saved — clients only see times you work." : "Could not save");
  }

  function startEdit(b: Block) {
    setEditingId(b.id);
    setLeaveStart(toLocalInput(b.startsAt));
    setLeaveEnd(toLocalInput(b.endsAt));
    setLeaveReason(b.reason);
    setLeaveNote(b.note || "");
    setMessage("Change the times, then tap Save.");
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
      setMessage("End time must be after start.");
      return;
    }
    const res = await fetch(`/api/admin/stylists/${stylistId}/blocks`, {
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
    if (!res.ok) {
      const text = await res.text();
      try {
        const data = text ? JSON.parse(text) : {};
        setMessage(data.error || "Could not save");
      } catch {
        setMessage("Could not save");
      }
      return;
    }
    const wasEdit = Boolean(editingId);
    const saved = await res.json().catch(() => ({}));
    cancelEdit();
    if (!wasEdit && saved.block?.status === "PENDING") {
      setMessage("Leave requested — waiting for admin approval.");
    } else {
      setMessage(
        wasEdit ? "Updated." : "Marked away — those times are hidden from booking."
      );
    }
    await loadSchedule(stylistId);
  }

  async function removeBlock(blockId: string) {
    if (!window.confirm("Remove this time off?")) return;
    await fetch(`/api/admin/stylists/${stylistId}/blocks?blockId=${blockId}`, {
      method: "DELETE",
    });
    await loadSchedule(stylistId);
  }

  if (!stylistId) return <p className="py-16 text-center text-muted">Loading…</p>;

  return (
    <main className="space-y-10">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Schedule</h1>
        <p className="mt-2 text-muted">
          Set your work days and mark time off. Clients can&apos;t book when you&apos;re away.
        </p>
      </div>

      {message ? <p className="text-sm text-champagne">{message}</p> : null}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          I&apos;m away
        </h2>
        <form onSubmit={saveLeave} className="grid gap-3 rounded-2xl border border-ink/15 bg-cream p-4">
          {editingId ? (
            <p className="text-sm text-champagne">Editing — fix times and save.</p>
          ) : null}
          <label className="grid gap-1 text-sm">
            From
            <input
              required
              type="datetime-local"
              value={leaveStart}
              onChange={(e) => setLeaveStart(e.target.value)}
              className="stylist-tap rounded-2xl border border-ink/15 bg-white px-3 text-ink"
            />
          </label>
          <label className="grid gap-1 text-sm">
            To
            <input
              required
              type="datetime-local"
              value={leaveEnd}
              onChange={(e) => setLeaveEnd(e.target.value)}
              className="stylist-tap rounded-2xl border border-ink/15 bg-white px-3 text-ink"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Why
            <select
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              className="stylist-tap rounded-2xl border border-ink/15 bg-white px-3 text-ink"
            >
              <option value="LEAVE">Away / vacation</option>
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
              placeholder="e.g. lunch, dentist"
              className="stylist-tap rounded-2xl border border-ink/15 bg-white px-3 text-ink"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="stylist-tap btn-solid flex-1 rounded-2xl px-5">
              {editingId ? "Save" : "Mark me away"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={cancelEdit}
                className="stylist-tap rounded-2xl border border-ink/20 px-5"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <div className="divide-y divide-ink/10 overflow-hidden rounded-2xl border border-ink/15 bg-cream">
          {blocks.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">No time off marked yet.</p>
          ) : null}
          {blocks.map((b) => (
            <div key={b.id} className="space-y-3 px-4 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-champagne">
                  {reasonLabel(b.reason)}
                </p>
                <p className={`mt-1 text-sm font-semibold ${statusClass(b.status)}`}>
                  {statusLabel(b.status)}
                </p>
                <p className="mt-1 text-sm">
                  {new Date(b.startsAt).toLocaleString("en-CA", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}
                  →{" "}
                  {new Date(b.endsAt).toLocaleString("en-CA", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                {b.note ? <p className="text-sm text-muted">{b.note}</p> : null}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {b.status !== "REJECTED" ? (
                  <button
                    type="button"
                    onClick={() => startEdit(b)}
                    className="stylist-tap rounded-2xl border border-ink/20"
                  >
                    Edit
                  </button>
                ) : (
                  <div />
                )}
                <button
                  type="button"
                  onClick={() => removeBlock(b.id)}
                  className="stylist-tap rounded-2xl border border-[rgba(245,168,168,0.45)] text-[#f5a8a8]"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <form onSubmit={saveHours} className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Days I work
        </h2>
        <div className="divide-y divide-ink/10 overflow-hidden rounded-2xl border border-ink/15 bg-cream">
          {weekHours.map((row) => (
            <div key={row.dayOfWeek} className="space-y-2 px-4 py-3">
              <label className="flex items-center gap-3 text-base font-semibold">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={!row.isOff}
                  onChange={(e) => updateDay(row.dayOfWeek, { isOff: !e.target.checked })}
                />
                {DAY_NAMES[row.dayOfWeek]}
              </label>
              {row.isOff ? (
                <p className="pl-8 text-sm text-muted">Day off</p>
              ) : (
                <div className="flex flex-wrap items-center gap-2 pl-8 text-sm">
                  <select
                    value={row.startHour}
                    onChange={(e) =>
                      updateDay(row.dayOfWeek, { startHour: Number(e.target.value) })
                    }
                    className="stylist-tap min-h-11 rounded-xl border border-ink/15 bg-white px-2 text-ink"
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                  <span className="text-muted">to</span>
                  <select
                    value={row.endHour}
                    onChange={(e) =>
                      updateDay(row.dayOfWeek, { endHour: Number(e.target.value) })
                    }
                    className="stylist-tap min-h-11 rounded-xl border border-ink/15 bg-white px-2 text-ink"
                  >
                    {Array.from({ length: 24 }, (_, h) => (
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
        <button type="submit" className="stylist-tap btn-solid w-full rounded-2xl px-5">
          Save work days
        </button>
      </form>
    </main>
  );
}
