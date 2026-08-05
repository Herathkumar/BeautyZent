"use client";

import { useEffect, useMemo, useState } from "react";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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

function toLocalDayAt(d: Date, hour: number, minute = 0) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hour)}:${pad(minute)}`;
}

function toLocalDayStart(d: Date) {
  return toLocalDayAt(d, 9, 0);
}

function toLocalDayEnd(d: Date) {
  return toLocalDayAt(d, 18, 0);
}

function ymd(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = polar(cx, cy, r, startDeg);
  const e = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

function WeekRing({
  weekHours,
  selectedDay,
  onSelectDay,
}: {
  weekHours: WeekHour[];
  selectedDay: number;
  onSelectDay: (day: number) => void;
}) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const r = 104;
  const gap = 5;
  const seg = (360 - gap * 7) / 7;

  return (
    <div className="relative mx-auto w-full max-w-[300px]" data-testid="schedule-week-ring">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(126,196,184,0.08)" strokeWidth="30" />
        {weekHours.map((row) => {
          const i = row.dayOfWeek;
          const start = -90 + i * (seg + gap) + gap / 2;
          const end = start + seg;
          const mid = (start + end) / 2;
          const labelPos = polar(cx, cy, r, mid);
          const working = !row.isOff;
          const selected = selectedDay === i;
          return (
            <g key={i}>
              <path
                d={arcPath(cx, cy, r, start, end)}
                fill="none"
                stroke={
                  selected
                    ? "#b5ebe0"
                    : working
                      ? "#7ec4b8"
                      : "rgba(126,196,184,0.18)"
                }
                strokeWidth={selected ? 34 : 28}
                strokeLinecap="round"
                className="cursor-pointer transition-[stroke,stroke-width] duration-200"
                onClick={() => onSelectDay(i)}
                role="button"
                tabIndex={0}
                aria-label={`${DAY_FULL[i]}, ${working ? "working" : "day off"}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectDay(i);
                  }
                }}
              />
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none select-none"
                fill={selected || working ? "#0e1618" : "rgba(244,251,250,0.45)"}
                fontSize="11"
                fontWeight="700"
              >
                {DAY_NAMES[i]}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-16 text-center">
        <p className="text-[10px] font-semibold tracking-[0.18em] text-[#7ec4b8] uppercase">
          My week
        </p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[#f4fbfa]">
          {DAY_FULL[selectedDay]}
        </p>
        {(() => {
          const row = weekHours.find((r) => r.dayOfWeek === selectedDay);
          if (!row) return null;
          if (row.isOff) {
            return <p className="mt-1 text-sm text-[#a8c4bf]">Day off</p>;
          }
          return (
            <p className="mt-1 text-sm font-semibold text-[#b5ebe0]">
              {String(row.startHour).padStart(2, "0")}:00 –{" "}
              {String(row.endHour).padStart(2, "0")}:00
            </p>
          );
        })()}
      </div>
    </div>
  );
}

function AwayMonthStrip({
  month,
  onMonthChange,
  rangeStart,
  rangeEnd,
  onPickDay,
  awayDates,
}: {
  month: Date;
  onMonthChange: (d: Date) => void;
  rangeStart: string | null;
  rangeEnd: string | null;
  onPickDay: (d: Date) => void;
  awayDates: Set<string>;
}) {
  const year = month.getFullYear();
  const mon = month.getMonth();
  const first = new Date(year, mon, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const today = ymd(new Date());

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, mon, d));

  const label = month.toLocaleString("en-CA", { month: "long", year: "numeric" });

  function inRange(d: Date) {
    const key = ymd(d);
    if (!rangeStart) return false;
    if (!rangeEnd) return key === rangeStart;
    return key >= rangeStart && key <= rangeEnd;
  }

  return (
    <div data-testid="schedule-away-strip">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          className="rounded-full border border-[#7ec4b8]/35 px-3 py-1.5 text-sm text-[#b5ebe0]"
          aria-label="Previous month"
          onClick={() => onMonthChange(new Date(year, mon - 1, 1))}
        >
          ‹
        </button>
        <p className="font-[family-name:var(--font-display)] text-lg text-[#f4fbfa]">{label}</p>
        <button
          type="button"
          className="rounded-full border border-[#7ec4b8]/35 px-3 py-1.5 text-sm text-[#b5ebe0]"
          aria-label="Next month"
          onClick={() => onMonthChange(new Date(year, mon + 1, 1))}
        >
          ›
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold tracking-wide text-[#7ec4b8] uppercase">
        {DAY_NAMES.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, idx) => {
          if (!d) return <span key={`e-${idx}`} />;
          const key = ymd(d);
          const selected = inRange(d);
          const isAway = awayDates.has(key);
          const isToday = key === today;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPickDay(d)}
              className={[
                "relative aspect-square rounded-xl text-sm font-semibold transition",
                selected
                  ? "bg-[#7ec4b8] text-[#0e1618]"
                  : isAway
                    ? "bg-[#7ec4b8]/20 text-[#b5ebe0] ring-1 ring-[#7ec4b8]/40"
                    : "bg-[#10181c] text-[#f4fbfa] hover:bg-[#7ec4b8]/12",
                isToday && !selected ? "ring-1 ring-[#b5ebe0]/50" : "",
              ].join(" ")}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-center text-xs text-[#a8c4bf]">
        Tap a day, then another — or the same day — to mark yourself away
      </p>
    </div>
  );
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
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDay());
  const [awayMonth, setAwayMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [showAwayForm, setShowAwayForm] = useState(false);

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

  const awayDates = useMemo(() => {
    const set = new Set<string>();
    for (const b of blocks) {
      if (String(b.status || "").toUpperCase() === "REJECTED") continue;
      const start = new Date(b.startsAt);
      const end = new Date(b.endsAt);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
      const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      while (cur <= last) {
        set.add(ymd(cur));
        cur.setDate(cur.getDate() + 1);
      }
    }
    return set;
  }, [blocks]);

  const selectedRow = weekHours.find((r) => r.dayOfWeek === selectedDay);

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
    setShowAwayForm(true);
    setMessage("Change the times, then tap Save.");
  }

  function cancelEdit() {
    setEditingId(null);
    setLeaveStart("");
    setLeaveEnd("");
    setLeaveReason("LEAVE");
    setLeaveNote("");
    setRangeStart(null);
    setRangeEnd(null);
    setShowAwayForm(false);
    setMessage("");
  }

  function pickAwayDay(d: Date) {
    const key = ymd(d);
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(key);
      setRangeEnd(null);
      setLeaveStart(toLocalDayStart(d));
      setLeaveEnd(toLocalDayEnd(d));
      setShowAwayForm(true);
      setMessage("Tap another day to set the end — or mark this day away.");
      return;
    }
    let startKey = rangeStart;
    let endKey = key;
    if (endKey < startKey) {
      const tmp = startKey;
      startKey = endKey;
      endKey = tmp;
    }
    setRangeStart(startKey);
    setRangeEnd(endKey);
    const [sy, sm, sd] = startKey.split("-").map(Number);
    const [ey, em, ed] = endKey.split("-").map(Number);
    setLeaveStart(toLocalDayStart(new Date(sy, sm - 1, sd)));
    setLeaveEnd(toLocalDayEnd(new Date(ey, em - 1, ed)));
    setShowAwayForm(true);
    setMessage("Range selected — confirm below.");
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
    <main className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Schedule</h1>
        <p className="mt-2 text-muted">
          Shape your week on the ring. Tap the calendar strip when you need time away.
        </p>
        {selfManage ? (
          <p className="mt-1 text-xs text-[#7ec4b8]">Self-managed — leave auto-approves.</p>
        ) : (
          <p className="mt-1 text-xs text-[#a8c4bf]">Leave may need manager approval.</p>
        )}
      </div>

      {message ? <p className="text-sm text-[#b5ebe0]">{message}</p> : null}

      {/* #4 Away strip */}
      <section
        className="rounded-3xl border border-[#7ec4b8]/28 p-4"
        style={{
          background:
            "linear-gradient(165deg, rgba(126,196,184,0.14) 0%, rgba(26,40,44,0.96) 50%, #1a282c 100%)",
        }}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-[#7ec4b8] uppercase">
              Away
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-xl text-[#f4fbfa]">
              Pick days off
            </h2>
          </div>
          <button
            type="button"
            className="rounded-full border border-[#7ec4b8]/40 px-3 py-1.5 text-xs font-semibold text-[#b5ebe0]"
            onClick={() => {
              setShowAwayForm(true);
              setMessage("Set from / to, then mark yourself away.");
            }}
          >
            Manual times
          </button>
        </div>

        <AwayMonthStrip
          month={awayMonth}
          onMonthChange={setAwayMonth}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onPickDay={pickAwayDay}
          awayDates={awayDates}
        />

        {showAwayForm ? (
          <form
            onSubmit={saveLeave}
            className="mt-4 grid gap-3 rounded-2xl border border-[#7ec4b8]/25 bg-[#10181c]/70 p-4"
          >
            {editingId ? (
              <p className="text-sm text-[#b5ebe0]">Editing — fix times and save.</p>
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
              <button type="submit" className="stylist-tap btn-solid flex-1 rounded-full px-5">
                {editingId ? "Save" : "Mark me away"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="stylist-tap rounded-full border border-ink/20 px-5"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        <div className="mt-4 divide-y divide-[#7ec4b8]/15 overflow-hidden rounded-2xl border border-[#7ec4b8]/20 bg-[#10181c]/50">
          {blocks.length === 0 ? (
            <p className="px-4 py-5 text-sm text-[#a8c4bf]">No time off marked yet.</p>
          ) : null}
          {blocks.map((b) => (
            <div key={b.id} className="space-y-3 px-4 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#7ec4b8]">
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

      {/* #1 My Week ring */}
      <form
        onSubmit={saveHours}
        className="space-y-4 rounded-3xl border border-[#7ec4b8]/28 p-4"
        style={{
          background:
            "linear-gradient(180deg, rgba(16,24,28,0.9) 0%, rgba(26,40,44,0.98) 100%)",
        }}
      >
        <div className="text-center">
          <p className="text-xs font-semibold tracking-[0.18em] text-[#7ec4b8] uppercase">
            Regular hours
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[#f4fbfa]">
            Tap a day on the ring
          </h2>
        </div>

        <WeekRing
          weekHours={weekHours}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />

        {selectedRow ? (
          <div
            className="grid gap-3 rounded-2xl border border-[#7ec4b8]/25 bg-[#10181c]/70 p-4"
            data-testid="schedule-day-editor"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-[#f4fbfa]">{DAY_FULL[selectedDay]}</p>
              <div className="flex rounded-full border border-[#7ec4b8]/35 p-0.5">
                <button
                  type="button"
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                    !selectedRow.isOff
                      ? "bg-[#7ec4b8] text-[#0e1618]"
                      : "text-[#a8c4bf]"
                  }`}
                  onClick={() => updateDay(selectedDay, { isOff: false })}
                >
                  Working
                </button>
                <button
                  type="button"
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                    selectedRow.isOff
                      ? "bg-[#7ec4b8]/25 text-[#b5ebe0]"
                      : "text-[#a8c4bf]"
                  }`}
                  onClick={() => updateDay(selectedDay, { isOff: true })}
                >
                  Off
                </button>
              </div>
            </div>

            {selectedRow.isOff ? (
              <p className="text-sm text-[#a8c4bf]">Clients won&apos;t see this day.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <select
                  value={selectedRow.startHour}
                  onChange={(e) =>
                    updateDay(selectedDay, { startHour: Number(e.target.value) })
                  }
                  className="stylist-tap min-h-11 flex-1 rounded-xl border border-ink/15 bg-white px-2 text-ink"
                  aria-label={`${DAY_NAMES[selectedDay]} start`}
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
                <span className="text-muted">to</span>
                <select
                  value={selectedRow.endHour}
                  onChange={(e) =>
                    updateDay(selectedDay, { endHour: Number(e.target.value) })
                  }
                  className="stylist-tap min-h-11 flex-1 rounded-xl border border-ink/15 bg-white px-2 text-ink"
                  aria-label={`${DAY_NAMES[selectedDay]} end`}
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
        ) : null}

        <div className="flex flex-wrap justify-center gap-2">
          {weekHours.map((row) => (
            <button
              key={row.dayOfWeek}
              type="button"
              onClick={() => setSelectedDay(row.dayOfWeek)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                selectedDay === row.dayOfWeek
                  ? "bg-[#b5ebe0] text-[#0e1618]"
                  : row.isOff
                    ? "bg-[#10181c] text-[#a8c4bf]"
                    : "bg-[#7ec4b8]/20 text-[#b5ebe0]"
              }`}
            >
              {DAY_NAMES[row.dayOfWeek]}
            </button>
          ))}
        </div>

        <button type="submit" className="stylist-tap btn-solid w-full rounded-full px-5">
          Save work days
        </button>
      </form>
    </main>
  );
}
