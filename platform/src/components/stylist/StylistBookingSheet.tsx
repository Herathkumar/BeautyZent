"use client";

import { useEffect, useMemo, useState } from "react";
import { calendarDateInTz } from "@/lib/salon-time";

type Service = {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
  stylistIds?: string[];
};
type StylistOpt = { id: string; name: string; serviceIds: string[]; photoUrl?: string };

function formatSlotTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatShortDate(ymd: string) {
  return new Date(`${ymd}T12:00:00`).toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDuration(minutes: number) {
  if (minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m} min`;
}

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
  const [myStylistName, setMyStylistName] = useState("You");
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
  const [showAdjustTime, setShowAdjustTime] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setShowAdjustTime(false);
    setDurationBoost(0);
    setError("");
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
      const myName = meData.stylist?.name || meData.user?.name || "You";
      const salonSlug = meData.stylist?.salon?.slug || "fhsalon";
      setMyStylistId(id);
      setMyStylistName(myName);
      setStylistId(id);
      setSlug(salonSlug);
      setPhotoUrl(meData.stylist?.photoUrl || null);

      const cat = await fetch(`/api/public/${salonSlug}/catalog`).then((r) => r.json());
      const catalogServices = (cat.services || []) as Service[];
      const catalogStylists = (cat.stylists || []) as StylistOpt[];
      setServices(catalogServices);

      const allServiceIds = catalogServices.map((s) => s.id);
      const selfOpt: StylistOpt = {
        id,
        name: myName,
        serviceIds: allServiceIds,
        photoUrl: meData.stylist?.photoUrl || undefined,
      };
      const others = catalogStylists.filter((s) => s.id !== id);
      const selfFromCatalog = catalogStylists.find((s) => s.id === id);
      setStylists([
        selfFromCatalog
          ? {
              ...selfFromCatalog,
              serviceIds: Array.from(
                new Set([...(selfFromCatalog.serviceIds || []), ...allServiceIds])
              ),
            }
          : selfOpt,
        ...others,
      ]);

      const today =
        cat.salon?.today ||
        calendarDateInTz(cat.salon?.timezone || "America/Toronto");
      setMinDate(today);
      setDate((prev) => (prev < today ? today : prev));

      if (preset?.serviceId) setServiceId(preset.serviceId);
      else if (catalogServices[0]?.id) setServiceId(catalogServices[0].id);
      if (preset?.clientName) setClientName(preset.clientName);
      if (preset?.clientPhone) setClientPhone(preset.clientPhone);
      if (preset?.note) setNotes(preset.note);
    })();
  }, [open, preset]);

  const filteredStylists = useMemo(() => {
    if (!serviceId) return stylists;
    const matched = stylists.filter(
      (s) => s.id === myStylistId || s.serviceIds.includes(serviceId)
    );
    if (myStylistId && !matched.some((s) => s.id === myStylistId)) {
      return [
        {
          id: myStylistId,
          name: myStylistName,
          serviceIds: [serviceId],
          photoUrl: photoUrl || undefined,
        },
        ...matched,
      ];
    }
    return matched.sort((a, b) => {
      if (a.id === myStylistId) return -1;
      if (b.id === myStylistId) return 1;
      return 0;
    });
  }, [stylists, serviceId, myStylistId, myStylistName, photoUrl]);

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
      setSlotsLoading(false);
      return;
    }
    const ac = new AbortController();
    setSlots([]);
    setStartsAt("");
    setSlotsLoading(true);
    const q = new URLSearchParams({ serviceId, stylistId, date });
    fetch(`/api/public/${slug}/slots?${q}`, { signal: ac.signal, cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!ac.signal.aborted) {
          setSlots(data.slots || []);
          setSlotsLoading(false);
        }
      })
      .catch(() => {
        if (!ac.signal.aborted) {
          setSlots([]);
          setSlotsLoading(false);
        }
      });
    return () => ac.abort();
  }, [slug, serviceId, stylistId, date]);

  const selectedService = services.find((s) => s.id === serviceId) || null;
  const selectedStylist =
    filteredStylists.find((s) => s.id === stylistId) ||
    stylists.find((s) => s.id === stylistId) ||
    null;
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

  const staffLabel =
    stylistId === myStylistId
      ? `You (${selectedStylist?.name || myStylistName})`
      : selectedStylist?.name || "Staff";

  return (
    <>
      <button type="button" className="bz-sheet-backdrop" aria-label="Close booking" onClick={onClose} />
      <div
        className="bz-sheet bz-sheet--tall bz-book"
        role="dialog"
        aria-modal="true"
        aria-label="New booking"
        data-testid="stylist-booking-sheet"
      >
        <div className="bz-book__handle" />
        <div className="bz-book__head">
          <h2 className="bz-book__title">New booking</h2>
          <button type="button" className="bz-book__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="bz-book__body">
          <section className="bz-book__section">
            <p className="bz-book__eyebrow">Client</p>
            <input
              className="bz-book__input"
              placeholder="Search client…"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              data-testid="stylist-book-client-name"
            />
            <input
              className="bz-book__input"
              placeholder="Phone (optional)"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
            />
          </section>

          <section className="bz-book__section">
            <p className="bz-book__eyebrow">Service</p>
            <div className="bz-book__row-card">
              <div className="min-w-0 flex-1">
                <select
                  className="bz-book__select"
                  value={serviceId}
                  onChange={(e) => {
                    setServiceId(e.target.value);
                    setStartsAt("");
                    setDurationBoost(0);
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
                  <p className="bz-book__meta">
                    {formatDuration(durationMin)} · $
                    {(selectedService.priceCents / 100).toFixed(0)}
                  </p>
                ) : null}
              </div>
              <span className="bz-book__chevron" aria-hidden>
                ›
              </span>
            </div>
            {!showAdjustTime ? (
              <button
                type="button"
                className="bz-book__text-btn"
                onClick={() => setShowAdjustTime(true)}
              >
                Adjust time
              </button>
            ) : (
              <div className="bz-book__adjust">
                <span className="bz-book__meta">Duration</span>
                <div className="bz-book__stepper-row">
                  <button
                    type="button"
                    className="bz-book__stepper"
                    onClick={() => setDurationBoost((n) => Math.max(-2, n - 1))}
                    aria-label="Shorter"
                  >
                    −
                  </button>
                  <span className="bz-book__stepper-val">{formatDuration(durationMin)}</span>
                  <button
                    type="button"
                    className="bz-book__stepper"
                    onClick={() => setDurationBoost((n) => Math.min(4, n + 1))}
                    aria-label="Longer"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="bz-book__section">
            <p className="bz-book__eyebrow">When</p>
            <label className="bz-book__date">
              <span className="bz-book__date-label">{formatShortDate(date)}</span>
              <input
                type="date"
                className="bz-book__date-native"
                min={minDate}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setStartsAt("");
                }}
              />
              <span className="bz-book__chevron" aria-hidden>
                ›
              </span>
            </label>

            {slotsLoading ? (
              <p className="bz-book__empty">Loading times…</p>
            ) : slots.length === 0 ? (
              <p className="bz-book__empty">No times this day</p>
            ) : (
              <div className="bz-book__slots" role="listbox" aria-label="Available times">
                {slots.map((slot) => {
                  const active = startsAt === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={`bz-book__slot${active ? " is-on" : ""}`}
                      data-testid="stylist-book-slot"
                      onClick={() => setStartsAt(slot)}
                    >
                      {formatSlotTime(slot)}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="bz-book__section">
            <p className="bz-book__eyebrow">Staff</p>
            <div className="bz-book__row-card">
              {photoUrl && stylistId === myStylistId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="" className="bz-book__avatar" />
              ) : (
                <span className="bz-book__avatar bz-book__avatar--fallback">
                  {(selectedStylist?.name || "Y").slice(0, 1)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <select
                  className="bz-book__select"
                  value={stylistId}
                  onChange={(e) => {
                    setStylistId(e.target.value);
                    setStartsAt("");
                  }}
                >
                  {filteredStylists.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id === myStylistId ? `You (${s.name})` : s.name}
                    </option>
                  ))}
                </select>
                <p className="bz-book__meta">
                  {stylistId === myStylistId ? "Stylist" : staffLabel}
                </p>
              </div>
              <span className="bz-book__chevron" aria-hidden>
                ›
              </span>
            </div>
          </section>

          <section className="bz-book__section">
            <p className="bz-book__eyebrow">Notes</p>
            <input
              className="bz-book__input"
              placeholder="Add notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </section>

          <section className="bz-book__deposit">
            <div>
              <p className="bz-book__deposit-title">Require deposit</p>
              <p className="bz-book__meta">Client will be asked for a deposit</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={deposit}
              className={`bz-book__toggle${deposit ? " is-on" : ""}`}
              onClick={() => setDeposit((v) => !v)}
            >
              <span />
            </button>
          </section>

          {error ? <p className="bz-book__error">{error}</p> : null}
          {selectedStylist && !filteredStylists.length ? (
            <p className="bz-book__empty">No stylist offers this service.</p>
          ) : null}
        </div>

        <div className="bz-book__actions">
          <button
            type="button"
            className="bz-book__save"
            disabled={busy}
            onClick={() => void submit()}
            data-testid="stylist-book-submit"
          >
            {busy ? "Saving…" : "Save booking"}
          </button>
          <a href="/stylist/schedule" className="bz-book__block">
            Block time
          </a>
        </div>
      </div>
    </>
  );
}
