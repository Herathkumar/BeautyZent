"use client";

import { useEffect, useMemo, useState } from "react";
import { formatClock, type DisplayAppt, type DisplayStylist } from "@/lib/display-schedule";

function ymdInZone(iso: string, timeZone?: string | null) {
  return new Date(iso).toLocaleDateString("en-CA", {
    timeZone: timeZone || undefined,
  });
}

export function ReceptionRescheduleSheet({
  appt,
  stylists,
  slug,
  timeZone,
  unlockHeaders,
  onClose,
  onSaved,
}: {
  appt: DisplayAppt;
  stylists: DisplayStylist[];
  slug: string;
  timeZone?: string | null;
  unlockHeaders: Record<string, string>;
  onClose: () => void;
  onSaved: (next: { startsAt: string; endsAt: string; stylistId: string }) => void;
}) {
  const [date, setDate] = useState(() => ymdInZone(appt.startsAt, timeZone));
  const chairs = useMemo(
    () => stylists.filter((s) => s.id && s.id !== "none"),
    [stylists]
  );
  const [stylistId, setStylistId] = useState(
    () => appt.stylist.id || chairs[0]?.id || ""
  );
  const [slot, setSlot] = useState(appt.startsAt);
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const serviceId = appt.service.id;

  useEffect(() => {
    if (!stylistId && chairs[0]?.id) setStylistId(chairs[0].id);
  }, [chairs, stylistId]);

  useEffect(() => {
    if (!serviceId || !stylistId || !date) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    const q = new URLSearchParams({
      stylistId,
      serviceId,
      date,
      exceptId: appt.id,
    });
    fetch(`/api/public/${slug}/slots?${q}`, { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list: string[] = Array.isArray(data.slots) ? data.slots : [];
        const sameDay = ymdInZone(appt.startsAt, timeZone) === date && appt.stylist.id === stylistId;
        const merged =
          sameDay && !list.includes(appt.startsAt) ? [appt.startsAt, ...list] : list;
        merged.sort();
        setSlots(merged);
        setSlot((prev) => (merged.includes(prev) ? prev : merged[0] || ""));
      })
      .catch(() => {
        if (!cancelled) setError("Could not load open times.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [appt.id, appt.startsAt, appt.stylist.id, date, serviceId, slug, stylistId, timeZone]);

  async function save() {
    if (!slot || !stylistId) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/display/${slug}/appointments/${appt.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", ...unlockHeaders },
        body: JSON.stringify({ startsAt: slot, stylistId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not reschedule.");
        return;
      }
      const next = data.appointment;
      onSaved({
        startsAt: next?.startsAt || slot,
        endsAt: next?.endsAt || appt.endsAt,
        stylistId: next?.stylist?.id || stylistId,
      });
    } catch {
      setError("Could not reschedule.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <aside className="reception-quick reception-reschedule" data-testid="reception-reschedule">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg text-[color:var(--rx-text)]">
            Reschedule
          </h2>
          <p className="mt-1 text-sm text-[color:var(--rx-muted)]">
            {appt.client.name} · {appt.service.name}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-lg leading-none text-[color:var(--rx-faint)] hover:text-[color:var(--rx-text)]"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <label className="mb-3 block text-xs font-semibold tracking-wide text-[color:var(--rx-faint)] uppercase">
        Date
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 w-full rounded-xl border border-[color:var(--rx-line)] bg-[var(--rx-input)] px-3 py-2 text-sm font-medium normal-case text-[color:var(--rx-text)]"
        />
      </label>

      <label className="mb-3 block text-xs font-semibold tracking-wide text-[color:var(--rx-faint)] uppercase">
        Stylist
        <select
          value={stylistId}
          onChange={(e) => setStylistId(e.target.value)}
          className="mt-1 w-full rounded-xl border border-[color:var(--rx-line)] bg-[var(--rx-input)] px-3 py-2 text-sm font-medium normal-case text-[color:var(--rx-text)]"
        >
          {chairs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <p className="mb-2 text-xs font-semibold tracking-wide text-[color:var(--rx-faint)] uppercase">
        Time
      </p>
      {loading ? (
        <p className="text-sm text-[color:var(--rx-faint)]">Loading times…</p>
      ) : !serviceId ? (
        <p className="text-sm text-[color:var(--rx-faint)]">This visit is missing a service, so times cannot load.</p>
      ) : slots.length === 0 ? (
        <p className="text-sm text-[color:var(--rx-faint)]">No open times on that day.</p>
      ) : (
        <div className="reception-reschedule__slots">
          {slots.map((iso) => (
            <button
              key={iso}
              type="button"
              onClick={() => setSlot(iso)}
              className={`reception-reschedule__slot${slot === iso ? " is-on" : ""}`}
            >
              {formatClock(iso, timeZone)}
            </button>
          ))}
        </div>
      )}

      {error ? <p className="mt-3 text-sm text-[#c45b7a]">{error}</p> : null}

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-2xl border border-[color:var(--rx-line)] py-3 text-sm font-semibold text-[color:var(--rx-text-80)]"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!slot || saving}
          onClick={() => void save()}
          className="flex-1 rounded-2xl bg-[var(--rx-accent)] py-3 text-sm font-semibold text-white disabled:opacity-60"
          data-testid="reception-reschedule-save"
        >
          {saving ? "Saving…" : "Save time"}
        </button>
      </div>
    </aside>
  );
}
