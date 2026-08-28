"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ClientRow } from "@/components/display/ReceptionDeskViews";
import { stylistUtilization } from "@/components/display/ReceptionDailyMetrics";
import { formatClock, type DisplayAppt, type DisplayStylist } from "@/lib/display-schedule";
import { formatCad } from "@/lib/money";
import { calendarDateInTz } from "@/lib/salon-time";
import { ToggleSwitch } from "@/components/ToggleSwitch";

type CatalogService = {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
  stylistIds?: string[];
};

type WalkInOption = {
  stylistId: string;
  stylistName: string;
  startsAt: string;
  waitMinutes: number;
};

function formatWait(min: number | null | undefined) {
  if (min == null) return "—";
  const n = Math.max(0, min);
  if (n <= 0) return "Ready now";
  if (n < 60) return `~${n} min`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m ? `~${h}h ${m}m` : `~${h}h`;
}

function StylistPickRing({ pct }: { pct: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <svg className="reception-modal-stylist__ring" viewBox="0 0 64 64" aria-hidden>
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--rx-line)" strokeWidth="3" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke="var(--rx-util-ring)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
        transform="rotate(-90 32 32)"
      />
    </svg>
  );
}

function ReceptionModalShell({
  open,
  onClose,
  testId,
  tone,
  icon,
  badge,
  title,
  subtitle,
  meta,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  testId: string;
  tone: "new" | "walkin";
  icon: ReactNode;
  badge?: string;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="reception-modal-backdrop"
      data-testid={testId}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${testId}-title`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`reception-modal reception-modal--${tone}`}>
        <header className="reception-modal__header">
          <div className="reception-modal__head-main">
            <span className={`reception-modal__icon reception-modal__icon--${tone}`}>{icon}</span>
            <div>
              {badge ? <span className="reception-modal__badge">{badge}</span> : null}
              <h2 id={`${testId}-title`} className="reception-modal__title">
                {title}
              </h2>
              {subtitle ? <p className="reception-modal__subtitle">{subtitle}</p> : null}
            </div>
          </div>
          <div className="reception-modal__head-side">
            {meta}
            <button
              type="button"
              className="reception-modal__close"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </header>
        <div className="reception-modal__body">{children}</div>
        <footer className="reception-modal__footer">{footer}</footer>
      </div>
    </div>
  );
}

export function ReceptionNewBookingModal({
  open,
  slug,
  stylists,
  clients,
  services: seedServices,
  timeZone,
  todayKey,
  unlockHeaders,
  onClose,
  onCreated,
}: {
  open: boolean;
  slug: string;
  stylists: DisplayStylist[];
  clients: ClientRow[];
  services: CatalogService[];
  timeZone?: string | null;
  todayKey: string;
  unlockHeaders: Record<string, string>;
  onClose: () => void;
  onCreated: () => void;
}) {
  const tz = timeZone || "America/Toronto";
  const [services, setServices] = useState<CatalogService[]>(seedServices);
  const [serviceId, setServiceId] = useState("");
  const [stylistId, setStylistId] = useState("");
  const [date, setDate] = useState(todayKey || calendarDateInTz(tz));
  const [slots, setSlots] = useState<string[]>([]);
  const [startsAt, setStartsAt] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);

  const chairs = useMemo(
    () => stylists.filter((s) => s.id && s.id !== "none"),
    [stylists]
  );

  const loadCatalog = useCallback(async () => {
    const res = await fetch(`/api/display/${slug}/walk-in`, {
      credentials: "same-origin",
      headers: unlockHeaders,
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.services?.length) setServices(data.services);
  }, [slug, unlockHeaders]);

  useEffect(() => {
    if (!open) return;
    setError("");
    void loadCatalog();
  }, [open, loadCatalog]);

  const selectedService = services.find((s) => s.id === serviceId) || null;
  const filteredStylists = useMemo(() => {
    if (!serviceId) return chairs;
    const svc = services.find((s) => s.id === serviceId);
    if (!svc?.stylistIds?.length) return chairs;
    return chairs.filter((s) => svc.stylistIds!.includes(s.id));
  }, [chairs, serviceId, services]);

  useEffect(() => {
    if (!open) return;
    if (!filteredStylists.some((s) => s.id === stylistId)) {
      setStylistId(filteredStylists[0]?.id || "");
      setStartsAt("");
    }
  }, [open, filteredStylists, stylistId]);

  useEffect(() => {
    if (!open || !serviceId || !stylistId || !date) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    const q = new URLSearchParams({ serviceId, stylistId, date });
    fetch(`/api/public/${slug}/slots?${q}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list: string[] = Array.isArray(data.slots) ? data.slots : [];
        list.sort();
        setSlots(list);
        setStartsAt((prev) => (prev && list.includes(prev) ? prev : list[0] || ""));
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, slug, serviceId, stylistId, date]);

  const clientMatches = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return [];
    return clients
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone || "").includes(q) ||
          (c.email || "").toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [clientQuery, clients]);

  function pickClient(c: ClientRow) {
    setClientName(c.name);
    setClientPhone(c.phone || "");
    setClientQuery(c.name);
  }

  async function submit() {
    if (!serviceId || !stylistId || !startsAt || !clientName.trim()) {
      setError("Fill in client, service, stylist, and time.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/display/${slug}/appointments/create`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", ...unlockHeaders },
        body: JSON.stringify({
          serviceId,
          stylistId,
          startsAt,
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not create booking.");
        return;
      }
      onCreated();
    } catch {
      setError("Could not create booking.");
    } finally {
      setBusy(false);
    }
  }

  const slotLabel = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-CA", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <ReceptionModalShell
      open={open}
      onClose={onClose}
      testId="reception-new-booking-modal"
      tone="new"
      title="New Booking"
      icon={
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      }
      footer={
        <>
          <button type="button" className="reception-modal__btn reception-modal__btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="reception-modal__btn reception-modal__btn--new"
            disabled={busy || !serviceId || !stylistId || !startsAt || !clientName.trim()}
            data-testid="reception-new-booking-submit"
            onClick={() => void submit()}
          >
            {busy ? "Creating…" : "Create Booking"}
          </button>
        </>
      }
    >
      <div className="reception-modal__field">
        <span className="reception-modal__label">Client</span>
        <div className="reception-modal__search">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            value={clientQuery || clientName}
            onChange={(e) => {
              setClientQuery(e.target.value);
              setClientName(e.target.value);
            }}
            placeholder="Search or add new client…"
            aria-label="Booking client"
            className="reception-modal__input"
          />
        </div>
        {clientMatches.length ? (
          <ul className="reception-modal__client-list">
            {clientMatches.map((c) => (
              <li key={c.key}>
                <button type="button" className="reception-modal__client-pick" onClick={() => pickClient(c)}>
                  <strong>{c.name}</strong>
                  {c.phone ? <span>{c.phone}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <input
          value={clientPhone}
          onChange={(e) => setClientPhone(e.target.value)}
          placeholder="Phone (optional)"
          aria-label="Booking client phone"
          className="reception-modal__input mt-2"
        />
      </div>

      <div className="reception-modal__field">
        <span className="reception-modal__label">Service</span>
        <select
          required
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          aria-label="Booking service"
          className="reception-catalog-select reception-modal__select"
        >
          <option value="">Choose service</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.durationMin} min · {formatCad(s.priceCents)}
            </option>
          ))}
        </select>
      </div>

      <div className="reception-modal__field">
        <span className="reception-modal__label">Stylist</span>
        <div className="reception-modal-stylists">
          {filteredStylists.map((s) => {
            const on = stylistId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                className={`reception-modal-stylist${on ? " is-on" : ""}`}
                onClick={() => {
                  setStylistId(s.id);
                  setStartsAt("");
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.photoUrl || "/avatars/stylist-neutral.svg"} alt="" />
                <span>{s.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="reception-modal__row">
        <div className="reception-modal__field">
          <span className="reception-modal__label">Date</span>
          <input
            type="date"
            min={todayKey}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setStartsAt("");
            }}
            aria-label="Booking date"
            className="reception-modal__input"
          />
        </div>
        <div className="reception-modal__field">
          <span className="reception-modal__label">Duration</span>
          <input
            readOnly
            value={selectedService ? `${selectedService.durationMin} min` : "—"}
            aria-label="Booking duration"
            className="reception-modal__input"
          />
        </div>
      </div>

      <div className="reception-modal__field">
        <span className="reception-modal__label">Time</span>
        {loadingSlots ? (
          <p className="reception-modal__hint">Loading open times…</p>
        ) : slots.length ? (
          <div className="reception-modal-slots" data-testid="reception-new-booking-slots">
            {slots.map((iso) => (
              <button
                key={iso}
                type="button"
                className={`reception-modal-slots__btn${startsAt === iso ? " is-on" : ""}`}
                onClick={() => setStartsAt(iso)}
              >
                {slotLabel(iso)}
              </button>
            ))}
          </div>
        ) : (
          <p className="reception-modal__hint">No open times for this day — try another date or stylist.</p>
        )}
      </div>

      <div className="reception-modal__field">
        <span className="reception-modal__label">Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 240))}
          placeholder="Any special requests or allergies…"
          rows={2}
          className="reception-modal__textarea"
        />
      </div>

      {error ? <p className="reception-modal__error">{error}</p> : null}
    </ReceptionModalShell>
  );
}

export function ReceptionWalkInModal({
  open,
  slug,
  stylists,
  services: seedServices,
  todayAppts,
  openHour,
  closeHour,
  timeZone,
  unlockHeaders,
  onClose,
  onCreated,
}: {
  open: boolean;
  slug: string;
  stylists: DisplayStylist[];
  services: CatalogService[];
  todayAppts: DisplayAppt[];
  openHour: number;
  closeHour: number;
  timeZone?: string | null;
  unlockHeaders: Record<string, string>;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [services, setServices] = useState<CatalogService[]>(seedServices);
  const [catalogStylists, setCatalogStylists] = useState<{ id: string; name: string }[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [stylistId, setStylistId] = useState("");
  const [useNextAvailable, setUseNextAvailable] = useState(true);
  const [guestMode, setGuestMode] = useState(true);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [options, setOptions] = useState<WalkInOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const chairs = useMemo(
    () => stylists.filter((s) => s.id && s.id !== "none"),
    [stylists]
  );

  const loadCatalog = useCallback(async () => {
    const res = await fetch(`/api/display/${slug}/walk-in`, {
      credentials: "same-origin",
      headers: unlockHeaders,
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.services?.length) setServices(data.services);
    if (data.stylists?.length) setCatalogStylists(data.stylists);
  }, [slug, unlockHeaders]);

  const loadNext = useCallback(async () => {
    if (!serviceId) {
      setOptions([]);
      return;
    }
    const q = new URLSearchParams({ serviceId });
    if (!useNextAvailable && stylistId) q.set("stylistId", stylistId);
    const res = await fetch(`/api/display/${slug}/walk-in?${q}`, { headers: unlockHeaders });
    if (!res.ok) {
      setOptions([]);
      return;
    }
    const data = await res.json();
    setOptions(data.options || []);
  }, [serviceId, stylistId, useNextAvailable, slug, unlockHeaders]);

  useEffect(() => {
    if (!open) return;
    setError("");
    setClientName("");
    setClientPhone("");
    setNotes("");
    setServiceId("");
    setUseNextAvailable(true);
    setGuestMode(true);
    void loadCatalog();
  }, [open, loadCatalog]);

  useEffect(() => {
    if (!open) return;
    void loadNext();
  }, [open, loadNext]);

  const filteredStylists = useMemo(() => {
    const list = catalogStylists.length
      ? chairs.filter((c) => catalogStylists.some((s) => s.id === c.id))
      : chairs;
    if (!serviceId) return list;
    const svc = services.find((s) => s.id === serviceId);
    if (!svc?.stylistIds?.length) return list;
    return list.filter((s) => svc.stylistIds!.includes(s.id));
  }, [chairs, catalogStylists, serviceId, services]);

  useEffect(() => {
    if (useNextAvailable || filteredStylists.some((s) => s.id === stylistId)) return;
    setStylistId(filteredStylists[0]?.id || "");
  }, [filteredStylists, stylistId, useNextAvailable]);

  const next = options[0] || null;
  const waitMin = next?.waitMinutes ?? 0;
  const nowLabel = new Date().toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  });

  async function submit() {
    if (!serviceId) {
      setError("Pick a service.");
      return;
    }
    if (!useNextAvailable && !stylistId) {
      setError("Pick a stylist or use next available.");
      return;
    }
    setBusy(true);
    setError("");
    const body: Record<string, unknown> = {
      serviceId,
      clientName: clientName.trim() || "Walk-in",
      clientPhone: clientPhone.trim(),
      notes: notes.trim(),
    };
    if (!useNextAvailable && stylistId) {
      body.stylistId = stylistId;
    }
    try {
      const res = await fetch(`/api/display/${slug}/walk-in`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", ...unlockHeaders },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not check in walk-in.");
        return;
      }
      onCreated();
    } catch {
      setError("Could not check in walk-in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ReceptionModalShell
      open={open}
      onClose={onClose}
      testId="reception-walk-in-modal"
      tone="walkin"
      badge="Walk-in"
      title="New Walk-in Client"
      subtitle="Quick check-in for clients without an appointment."
      icon={
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8 20v-2c0-2.2 1.8-4 4-4s4 1.8 4 4v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M16 10l2-1.5M18 12l2 .5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      }
      meta={
        <div className="reception-modal__meta">
          <p>{nowLabel}</p>
          <p className="reception-modal__meta-wait">
            Est. wait: <strong>{formatWait(waitMin)}</strong>
          </p>
        </div>
      }
      footer={
        <>
          <button type="button" className="reception-modal__btn reception-modal__btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="reception-modal__btn reception-modal__btn--walkin"
            disabled={busy || !serviceId || (!useNextAvailable && !stylistId)}
            data-testid="reception-walk-in-submit"
            onClick={() => void submit()}
          >
            {busy ? "Checking in…" : "Check in Walk-in →"}
          </button>
        </>
      }
    >
      <div className="reception-modal__field">
        <span className="reception-modal__label">Client</span>
        <div className="reception-modal__search">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Search existing or enter walk-in name…"
            aria-label="Walk-in client name"
            className="reception-modal__input"
          />
        </div>
        <label className="reception-modal__toggle-row mt-2">
          <span>Guest (no profile)</span>
          <ToggleSwitch
            variant="reception"
            checked={guestMode}
            onChange={setGuestMode}
            ariaLabel="Guest no profile"
          />
        </label>
        {!guestMode ? (
          <input
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            placeholder="Phone (optional)"
            aria-label="Walk-in client phone"
            className="reception-modal__input mt-2"
          />
        ) : null}
      </div>

      <div className="reception-modal__field">
        <span className="reception-modal__label">Service</span>
        <div className="reception-modal-services">
          {services.map((s) => {
            const on = serviceId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                className={`reception-modal-service${on ? " is-on" : ""}`}
                onClick={() => setServiceId(s.id)}
              >
                <strong>{s.name}</strong>
                <span>
                  {s.durationMin} min · {formatCad(s.priceCents)}
                </span>
              </button>
            );
          })}
        </div>
        <select
          required
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          aria-label="Walk-in service"
          className="sr-only"
          tabIndex={-1}
        >
          <option value="">Choose service</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="reception-modal__field">
        <span className="reception-modal__label">Assign to</span>
        <label className="reception-modal__toggle-row mb-2">
          <span>Next available stylist</span>
          <ToggleSwitch
            variant="reception"
            checked={useNextAvailable}
            onChange={setUseNextAvailable}
            ariaLabel="Next available stylist"
          />
        </label>
        {!useNextAvailable ? (
          <div className="reception-modal-stylists reception-modal-stylists--assign">
            {filteredStylists.map((s) => {
              const on = stylistId === s.id;
              const items = todayAppts.filter(
                (a) => a.stylist.id === s.id || a.stylist.name === s.name
              );
              const pct = stylistUtilization(items, openHour, closeHour, timeZone);
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`reception-modal-stylist reception-modal-stylist--assign${on ? " is-on" : ""}`}
                  onClick={() => setStylistId(s.id)}
                >
                  <span className="reception-modal-stylist__photo">
                    <StylistPickRing pct={pct} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.photoUrl || "/avatars/stylist-neutral.svg"} alt="" />
                    <span className="reception-modal-stylist__pct">{pct}%</span>
                  </span>
                  <strong>{s.name}</strong>
                  <span>Available</span>
                </button>
              );
            })}
          </div>
        ) : next ? (
          <p className="reception-modal__hint">
            Next open: <strong>{next.stylistName}</strong> at{" "}
            {formatClock(next.startsAt, timeZone)} · {formatWait(next.waitMinutes)}
          </p>
        ) : serviceId ? (
          <p className="reception-modal__hint">No open slot — try another service or assign a stylist.</p>
        ) : null}
      </div>

      <div className="reception-modal__field">
        <span className="reception-modal__label">Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 120))}
          placeholder="Add any notes for the stylist (optional)…"
          rows={2}
          className="reception-modal__textarea"
        />
        <p className="reception-modal__counter">{notes.length}/120</p>
      </div>

      {error ? <p className="reception-modal__error">{error}</p> : null}
    </ReceptionModalShell>
  );
}
