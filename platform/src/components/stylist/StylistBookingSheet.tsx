"use client";

import { useEffect, useMemo, useState } from "react";
import { calendarDateInTz } from "@/lib/salon-time";
import { LotusMark } from "./StylistWaitlistSheet";

type Service = {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
  stylistIds?: string[];
};
type StylistOpt = { id: string; name: string; serviceIds: string[]; photoUrl?: string };

export function StylistBookingSheet({
  open,
  onClose,
  onCreated,
  preset,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  preset?: {
    clientName?: string;
    clientPhone?: string | null;
    serviceId?: string | null;
    note?: string | null;
  } | null;
}) {
  const [myStylistId, setMyStylistId] = useState("");
  const [slug, setSlug] = useState("fhsalon");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<StylistOpt[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [stylistId, setStylistId] = useState("");
  const [minDate, setMinDate] = useState(() => calendarDateInTz("America/Toronto"));
  const [date, setDate] = useState(() => calendarDateInTz("America/Toronto"));
  const [slots, setSlots] = useState<string[]>([]);
  const [startsAt, setStartsAt] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [deposit, setDeposit] = useState(true);
  const [durationBoost, setDurationBoost] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const me = await fetch("/api/stylist/me");
      if (me.status === 401) {
        window.location.href = "/stylist/login";
        return;
      }
      if (!me.ok) {
        setError("Could not load your profile.");
        return;
      }
      const meData = await me.json();
      const id = meData.stylist?.id || "";
      const salonSlug = meData.stylist?.salon?.slug || "fhsalon";
      setMyStylistId(id);
      setStylistId(id);
      setSlug(salonSlug);
      setPhotoUrl(meData.stylist?.photoUrl || null);

      const cat = await fetch(`/api/public/${salonSlug}/catalog`).then((r) => r.json());
      setServices(cat.services || []);
      setStylists(cat.stylists || []);
      const today =
        cat.salon?.today ||
        calendarDateInTz(cat.salon?.timezone || "America/Toronto");
      setMinDate(today);
      setDate((prev) => (prev < today ? today : prev));

      if (preset?.serviceId) setServiceId(preset.serviceId);
      else if (cat.services?.[0]?.id) setServiceId(cat.services[0].id);
      if (preset?.clientName) setClientName(preset.clientName);
      if (preset?.clientPhone) setClientPhone(preset.clientPhone);
      if (preset?.note) setNotes(preset.note);
    })();
  }, [open, preset]);

  const filteredStylists = useMemo(() => {
    if (!serviceId) return stylists;
    return stylists.filter((s) => s.serviceIds.includes(serviceId));
  }, [stylists, serviceId]);

  useEffect(() => {
    if (!serviceId || !filteredStylists.length) return;
    if (!filteredStylists.some((s) => s.id === stylistId)) {
      const preferSelf = filteredStylists.find((s) => s.id === myStylistId);
      setStylistId(preferSelf?.id || filteredStylists[0]!.id);
      setStartsAt("");
    }
  }, [serviceId, filteredStylists, stylistId, myStylistId]);

  useEffect(() => {
    if (!serviceId || !stylistId || !date || !slug) {
      setSlots([]);
      return;
    }
    const ac = new AbortController();
    setSlots([]);
    const q = new URLSearchParams({ serviceId, stylistId, date });
    fetch(`/api/public/${slug}/slots?${q}`, { signal: ac.signal, cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!ac.signal.aborted) setSlots(data.slots || []);
      })
      .catch(() => {
        if (!ac.signal.aborted) setSlots([]);
      });
    return () => ac.abort();
  }, [slug, serviceId, stylistId, date]);

  const selectedService = services.find((s) => s.id === serviceId) || null;
  const selectedStylist = stylists.find((s) => s.id === stylistId) || null;
  const durationMin = (selectedService?.durationMin || 0) + durationBoost * 15;

  async function submit() {
    setError("");
    if (!startsAt) {
      setError("Pick an available time.");
      return;
    }
    if (!clientName.trim()) {
      setError("Add a client name.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/stylist/appointments/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId,
        stylistId,
        startsAt,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim() || null,
        notes: [
          notes.trim(),
          deposit ? "Deposit required" : null,
          durationBoost ? `Duration adjust +${durationBoost * 15}m` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not save booking.");
      return;
    }
    onCreated?.();
    onClose();
  }

  if (!open) return null;

  const timeLabel = startsAt
    ? new Date(startsAt).toLocaleTimeString("en-CA", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "Pick time";

  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <button type="button" className="bz-sheet-backdrop" aria-label="Close booking" onClick={onClose} />
      <div
        className="bz-sheet bz-sheet--tall"
        role="dialog"
        aria-modal="true"
        aria-label="New booking"
        data-testid="stylist-booking-sheet"
      >
        <div className="bz-sheet__handle" />
        <div className="bz-sheet__head">
          <h2 className="text-xl font-bold">New Booking</h2>
          <button type="button" className="bz-icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="bz-sheet__body space-y-4">
          <label className="bz-field">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[color:var(--bz-muted)]">
              Client
            </span>
            <input
              className="bz-input"
              placeholder="Search client or add new"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              data-testid="stylist-book-client-name"
            />
          </label>
          <input
            className="bz-input"
            placeholder="Phone (optional)"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
          />

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--bz-muted)]">
              Service
            </p>
            <div className="bz-service-card">
              <LotusMark className="h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <select
                  className="w-full bg-transparent font-semibold outline-none"
                  value={serviceId}
                  onChange={(e) => {
                    setServiceId(e.target.value);
                    setStartsAt("");
                  }}
                  data-testid="stylist-book-service"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {selectedService ? (
                  <p className="text-sm text-[color:var(--bz-muted)]">
                    {selectedService.durationMin} min
                  </p>
                ) : null}
              </div>
              <span className="font-semibold text-[color:var(--bz-ink)]">
                {selectedService ? `$${(selectedService.priceCents / 100).toFixed(0)}` : ""}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="bz-field">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[color:var(--bz-muted)]">
                Date
              </span>
              <input
                type="date"
                className="bz-input"
                min={minDate}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setStartsAt("");
                }}
              />
              <span className="mt-1 block text-xs text-[color:var(--bz-muted)]">{dateLabel}</span>
            </label>
            <label className="bz-field">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[color:var(--bz-muted)]">
                Time
              </span>
              <select
                className="bz-input"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                data-testid="stylist-book-slot"
              >
                <option value="">{slots.length ? "Available slots" : "No slots"}</option>
                {slots.map((s) => (
                  <option key={s} value={s}>
                    {new Date(s).toLocaleTimeString("en-CA", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-[color:var(--bz-muted)]">{timeLabel}</span>
            </label>
          </div>

          <div className="bz-service-card">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8f4f1] text-sm font-bold text-[#1f7a6e]">
                You
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--bz-muted)]">
                Staff
              </p>
              <select
                className="w-full bg-transparent font-semibold outline-none"
                value={stylistId}
                onChange={(e) => {
                  setStylistId(e.target.value);
                  setStartsAt("");
                }}
              >
                {filteredStylists.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id === myStylistId ? "You" : s.name}
                  </option>
                ))}
              </select>
            </div>
            <span aria-hidden>›</span>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-[#ece7e0] px-3 py-2">
            <p className="text-sm font-medium">Duration</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="bz-stepper"
                onClick={() => setDurationBoost((n) => Math.max(-2, n - 1))}
                aria-label="Shorter"
              >
                −
              </button>
              <span className="min-w-[4rem] text-center text-sm font-semibold">
                {Math.floor(durationMin / 60) > 0
                  ? `${Math.floor(durationMin / 60)}h ${durationMin % 60 ? `${durationMin % 60}m` : ""}`.trim()
                  : `${durationMin}m`}
              </span>
              <button
                type="button"
                className="bz-stepper"
                onClick={() => setDurationBoost((n) => Math.min(4, n + 1))}
                aria-label="Longer"
              >
                +
              </button>
            </div>
          </div>

          <textarea
            className="bz-input min-h-[4.5rem] resize-none"
            placeholder="Add any notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Deposit required</p>
              <p className="text-xs text-[color:var(--bz-muted)]">Secure the appointment.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={deposit}
              className={`bz-toggle${deposit ? " is-on" : ""}`}
              onClick={() => setDeposit((v) => !v)}
            >
              <span />
            </button>
          </div>

          {error ? <p className="bz-sheet__error">{error}</p> : null}
          {selectedStylist && !filteredStylists.length ? (
            <p className="text-sm text-[color:var(--bz-muted)]">No stylist offers this service.</p>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <a href="/stylist/schedule" className="bz-btn-ghost text-center">
            Block time
          </a>
          <button
            type="button"
            className="bz-btn-gold"
            disabled={busy}
            onClick={() => void submit()}
            data-testid="stylist-book-submit"
          >
            {busy ? "Saving…" : "Save booking"}
          </button>
        </div>
      </div>
    </>
  );
}
