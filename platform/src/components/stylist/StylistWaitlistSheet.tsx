"use client";

import { useCallback, useEffect, useState } from "react";

type WaitEntry = {
  id: string;
  clientName: string;
  clientPhone: string | null;
  estimatedWaitMin: number | null;
  note: string | null;
  createdAt?: string;
  service: { id: string; name: string; durationMin?: number } | null;
  stylist: { id: string; name: string } | null;
};

function formatWait(min: number | null | undefined) {
  if (min == null) return "Waiting";
  if (min <= 0) return "Ready now";
  if (min < 60) return `Waiting ${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `Waiting ${h}h ${m}m` : `Waiting ${h}h`;
}

function durationLabel(min?: number | null) {
  if (!min) return null;
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function StylistWaitlistSheet({
  open,
  onClose,
  onBook,
  onAdd,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  onBook: (entry: WaitEntry) => void;
  onAdd: () => void;
  onChanged?: () => void;
}) {
  const [waitlist, setWaitlist] = useState<WaitEntry[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/stylist/waitlist");
    if (!res.ok) return;
    const data = await res.json();
    setWaitlist(data.waitlist || []);
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
    const id = window.setInterval(load, 30_000);
    return () => window.clearInterval(id);
  }, [open, load]);

  async function notify(id: string) {
    setBusyId(id);
    setError("");
    try {
      // Soft notify — seating happens via Book now
      setWaitlist((list) => list);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    setError("");
    const res = await fetch("/api/stylist/waitlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "cancel" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not remove guest.");
      setBusyId(null);
      return;
    }
    await load();
    onChanged?.();
    setBusyId(null);
  }

  if (!open) return null;

  return (
    <>
      <button type="button" className="bz-sheet-backdrop" aria-label="Close waitlist" onClick={onClose} />
      <div
        className="bz-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Waitlist"
        data-testid="stylist-waitlist-sheet"
      >
        <div className="bz-sheet__handle" />
        <div className="bz-sheet__head">
          <div>
            <h2>
              Waitlist
              <span className="bz-pill-mint">{waitlist.length} waiting</span>
            </h2>
            <p className="bz-sheet__sub">They get first offer when a slot opens.</p>
          </div>
          <button type="button" className="bz-icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {error ? <p className="bz-sheet__error">{error}</p> : null}

        <div className="bz-sheet__body space-y-3" data-testid="walk-in-waitlist">
          {waitlist.length === 0 ? (
            <p className="py-8 text-center text-sm text-[color:var(--bz-muted)]">
              Nobody waiting — add a guest when the floor fills up.
            </p>
          ) : (
            waitlist.map((w, i) => (
              <article key={w.id} className="bz-wait-card" data-testid="waitlist-entry">
                <div className="flex items-start gap-3">
                  <span className="bz-wait-card__avatar" aria-hidden>
                    {(w.clientName || "?").slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[color:var(--bz-ink)]">
                          {w.clientName}
                        </p>
                        <p className="truncate text-sm text-[color:var(--bz-muted)]">
                          {w.service?.name || "Any service"}
                          {durationLabel(w.service?.durationMin)
                            ? ` · ${durationLabel(w.service?.durationMin)}`
                            : ""}
                        </p>
                      </div>
                      <span className={`bz-tag${i === 0 ? " is-priority" : ""}`}>
                        {i === 0 ? "Priority" : "Flexible"}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[color:var(--bz-muted)]">
                      <span>{w.stylist ? `You only` : "Any stylist"}</span>
                      <span>{formatWait(w.estimatedWaitMin)}</span>
                    </div>
                    {w.note ? (
                      <p className="mt-2 text-xs text-[color:var(--bz-muted)]">{w.note}</p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="bz-btn-ghost"
                    disabled={busyId === w.id}
                    onClick={() => void notify(w.id)}
                  >
                    Notify
                  </button>
                  <button
                    type="button"
                    className="bz-btn-gold"
                    data-testid="waitlist-seat-now"
                    disabled={busyId === w.id}
                    onClick={() => onBook(w)}
                  >
                    Book now
                  </button>
                </div>
                <button
                  type="button"
                  className="mt-2 w-full text-center text-xs font-semibold text-[color:var(--bz-muted)]"
                  disabled={busyId === w.id}
                  onClick={() => void remove(w.id)}
                >
                  Remove
                </button>
              </article>
            ))
          )}
        </div>

        <button type="button" className="bz-btn-outline mt-4 w-full" onClick={onAdd} data-testid="stylist-add-waitlist">
          + Add to waitlist
        </button>
      </div>
    </>
  );
}

export function StylistAddWaitlistSheet({
  open,
  onClose,
  onCreated,
  defaultStylistId,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  defaultStylistId: string;
}) {
  const [clientName, setClientName] = useState("");
  const [note, setNote] = useState("");
  const [priority, setPriority] = useState(true);
  const [notifySms, setNotifySms] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);
  const [preferSelf, setPreferSelf] = useState(true);
  const [dayPref, setDayPref] = useState("Flexible");
  const [timePref, setTimePref] = useState("Afternoon");
  const [services, setServices] = useState<{ id: string; name: string; durationMin: number; priceCents: number }[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      const me = await fetch("/api/stylist/me").then((r) => r.json());
      const slug = me.stylist?.salon?.slug;
      if (!slug) return;
      const cat = await fetch(`/api/public/${slug}/catalog`).then((r) => r.json());
      setServices(cat.services || []);
      if (!serviceId && cat.services?.[0]?.id) setServiceId(cat.services[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const selected = services.find((s) => s.id === serviceId);

  async function submit() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/stylist/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName: clientName.trim() || "Waitlist guest",
        serviceId: serviceId || null,
        note: [note, priority ? "Priority" : null, `Day: ${dayPref}`, `Time: ${timePref}`, notifySms ? "SMS" : null, notifyPush ? "Push" : null]
          .filter(Boolean)
          .join(" · "),
        preferSelf,
        stylistId: preferSelf ? defaultStylistId : null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not add to waitlist.");
      return;
    }
    setClientName("");
    setNote("");
    onCreated?.();
    onClose();
  }

  return (
    <>
      <button type="button" className="bz-sheet-backdrop" aria-label="Close" onClick={onClose} />
      <div
        className="bz-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Add to waitlist"
        data-testid="stylist-add-waitlist-sheet"
      >
        <div className="bz-sheet__handle" />
        <div className="bz-sheet__head">
          <div className="flex items-center gap-2">
            <LotusMark className="h-6 w-6" />
            <h2 className="font-[family-name:var(--font-display)] text-2xl">Add to waitlist</h2>
          </div>
          <button type="button" className="bz-icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="bz-sheet__body space-y-4">
          <label className="bz-field">
            <span className="sr-only">Client</span>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Search client or add new."
              className="bz-input"
            />
          </label>

          <button type="button" className="bz-service-card" onClick={() => {/* keep selected */}}>
            <span className="bz-service-card__icon" aria-hidden>
              ✂
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block font-semibold">{selected?.name || "Choose a service"}</span>
              {selected ? (
                <span className="text-sm text-[color:var(--bz-muted)]">
                  ${(selected.priceCents / 100).toFixed(0)} · {selected.durationMin} min
                </span>
              ) : null}
            </span>
            <span aria-hidden>›</span>
          </button>
          {services.length > 1 ? (
            <select
              className="bz-input"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              aria-label="Service"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : null}

          <ChipRow
            label="Preferred stylist"
            options={["You", "Any stylist"]}
            value={preferSelf ? "You" : "Any stylist"}
            onChange={(v) => setPreferSelf(v === "You")}
          />
          <ChipRow
            label="Preferred day"
            options={["Tomorrow", "This week", "Flexible"]}
            value={dayPref}
            onChange={setDayPref}
          />
          <ChipRow
            label="Preferred time"
            options={["Morning", "Afternoon", "Evening", "Anytime"]}
            value={timePref}
            onChange={setTimePref}
          />

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-[color:var(--bz-ink)]">
              Priority — offer this client first
            </p>
            <button
              type="button"
              role="switch"
              aria-checked={priority}
              className={`bz-toggle${priority ? " is-on" : ""}`}
              onClick={() => setPriority((v) => !v)}
            >
              <span />
            </button>
          </div>

          <textarea
            className="bz-input min-h-[4.5rem] resize-none"
            placeholder="Color formula / allergies."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div>
            <p className="mb-2 text-sm font-medium text-[color:var(--bz-ink)]">Notify via</p>
            <div className="flex gap-4">
              <CheckChip label="SMS" checked={notifySms} onChange={setNotifySms} />
              <CheckChip label="Push" checked={notifyPush} onChange={setNotifyPush} />
            </div>
          </div>

          {error ? <p className="bz-sheet__error">{error}</p> : null}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" className="px-2 text-sm font-semibold text-[color:var(--bz-muted)]" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="bz-btn-gold px-6" disabled={busy} onClick={() => void submit()}>
            {busy ? "Adding…" : "Add to waitlist"}
          </button>
        </div>
      </div>
    </>
  );
}

function ChipRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-[color:var(--bz-ink)]">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`bz-chip${value === opt ? " is-active" : ""}`}
            onClick={() => onChange(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function CheckChip({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button type="button" className="inline-flex items-center gap-2 text-sm" onClick={() => onChange(!checked)}>
      <span className={`bz-check${checked ? " is-on" : ""}`}>{checked ? "✓" : ""}</span>
      {label}
    </button>
  );
}

export function LotusMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden>
      <path
        d="M32 54c-1.8-8.5-8.2-16.2-14.8-20.4 4.2-1.6 9.4-1.2 14.8 1.4 5.4-2.6 10.6-3 14.8-1.4C40.2 37.8 33.8 45.5 32 54Z"
        fill="#c19a6b"
      />
      <path
        d="M32 50c2.2-9.5 9.8-15.8 16.5-17.2-1.2 7.8-7.2 14.8-16.5 17.2Z"
        fill="#d4b089"
        opacity="0.9"
      />
      <path
        d="M32 50c-2.2-9.5-9.8-15.8-16.5-17.2 1.2 7.8 7.2 14.8 16.5 17.2Z"
        fill="#d4b089"
        opacity="0.9"
      />
      <path
        d="M32 46c0-11 6.5-18.5 14-21.5-2.8 8.5-7.5 15.5-14 21.5Z"
        fill="#b88e4f"
        opacity="0.75"
      />
      <path
        d="M32 46c0-11-6.5-18.5-14-21.5 2.8 8.5 7.5 15.5 14 21.5Z"
        fill="#b88e4f"
        opacity="0.75"
      />
      <path
        d="M32 42c1.5-10 4.8-17 9.5-21.2C37.2 27 34 34.2 32 42Z"
        fill="#e0c49a"
        opacity="0.85"
      />
      <path
        d="M32 42c-1.5-10-4.8-17-9.5-21.2C26.8 27 30 34.2 32 42Z"
        fill="#e0c49a"
        opacity="0.85"
      />
      <circle cx="32" cy="22" r="3.2" fill="#c19a6b" />
    </svg>
  );
}
