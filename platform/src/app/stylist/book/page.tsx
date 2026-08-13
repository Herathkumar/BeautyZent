"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { calendarDateInTz } from "@/lib/salon-time";

type Service = {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
  stylistIds?: string[];
};
type StylistOpt = { id: string; name: string; serviceIds: string[] };

export default function StylistBookPage() {
  const [myStylistId, setMyStylistId] = useState("");
  const [slug, setSlug] = useState("fhsalon");
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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
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

      const cat = await fetch(`/api/public/${salonSlug}/catalog`).then((r) => r.json());
      setServices(cat.services || []);
      setStylists(cat.stylists || []);
      const today =
        cat.salon?.today ||
        calendarDateInTz(cat.salon?.timezone || "America/Toronto");
      setMinDate(today);
      setDate((prev) => (prev < today ? today : prev));
    })();
  }, []);

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
    const q = new URLSearchParams({ serviceId, stylistId, date });
    fetch(`/api/public/${slug}/slots?${q}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots || []));
  }, [slug, serviceId, stylistId, date]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) || null,
    [services, serviceId]
  );
  const selectedStylist = useMemo(
    () => stylists.find((s) => s.id === stylistId) || null,
    [stylists, stylistId]
  );

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setError("");
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("clientName") || clientName).trim();
    const phone = String(fd.get("clientPhone") || clientPhone).trim();
    const note = String(fd.get("notes") || notes);
    if (!startsAt) {
      setError("Pick an available slot.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/stylist/appointments/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stylistId,
        serviceId,
        startsAt,
        clientName: name,
        clientPhone: phone,
        notes: note,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not book");
      return;
    }
    const withWhom = data.appointment?.stylist?.name || selectedStylist?.name || "stylist";
    setMessage(
      `Booked ${name} with ${withWhom}` +
        (selectedService ? ` · ${selectedService.name}` : "")
    );
    setStartsAt("");
    setClientName("");
    setClientPhone("");
    setNotes("");
  }

  return (
    <main className="space-y-6" data-testid="stylist-book-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-champagne uppercase">
            My Jobs
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Book for a client</h1>
          <p className="text-muted">
            Phone / front-desk booking — for yourself or another stylist. Slots respect hours and
            leave.
          </p>
        </div>
        <Link
          href="/stylist"
          className="rounded-full border border-ink/20 px-4 py-2.5 text-sm font-semibold text-champagne"
        >
          Back to My Jobs
        </Link>
      </div>

      <form
        onSubmit={submit}
        className="grid gap-4 rounded-2xl border border-ink/15 bg-cream p-5"
        data-testid="stylist-book-form"
      >
        <label className="grid gap-1 text-sm">
          Service
          <select
            required
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              setStartsAt("");
            }}
            className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink"
            data-testid="stylist-book-service"
          >
            <option value="">Select…</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          Stylist
          <select
            required
            value={stylistId}
            onChange={(e) => {
              setStylistId(e.target.value);
              setStartsAt("");
            }}
            className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink"
            data-testid="stylist-book-stylist"
          >
            <option value="">Select…</option>
            {filteredStylists.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.id === myStylistId ? " (you)" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          Date
          <input
            type="date"
            required
            value={date}
            min={minDate}
            onChange={(e) => {
              const next = e.target.value;
              if (!next) return;
              setDate(next);
              setStartsAt("");
            }}
            className="admin-date-input w-full rounded-xl border border-ink/15 px-3 py-2"
            data-testid="stylist-book-date"
          />
        </label>

        <div>
          <p className="mb-2 text-sm">Available slots</p>
          <div className="flex flex-wrap gap-2" data-testid="stylist-book-slots">
            {!serviceId || !stylistId ? (
              <p className="text-sm text-muted">Choose a service and stylist to see open times.</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted">No open slots for this day.</p>
            ) : (
              slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setStartsAt(slot)}
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    startsAt === slot
                      ? "bg-champagne font-semibold text-[#0e1618]"
                      : "border border-ink/20"
                  }`}
                >
                  {new Date(slot).toLocaleTimeString("en-CA", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </button>
              ))
            )}
          </div>
        </div>

        <label className="grid gap-1 text-sm">
          Client name
          <input
            required
            name="clientName"
            autoComplete="off"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink"
            data-testid="stylist-book-client-name"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Client phone
          <input
            required
            name="clientPhone"
            autoComplete="off"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink"
            data-testid="stylist-book-client-phone"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Notes
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink"
          />
        </label>

        <button
          type="submit"
          disabled={!startsAt || busy}
          className="btn-solid rounded-full px-5 py-3 disabled:opacity-50"
          data-testid="stylist-book-submit"
        >
          {busy ? "Booking…" : "Create booking"}
        </button>
        {error ? <p className="text-sm text-[#f5a8a8]">{error}</p> : null}
        {message ? (
          <p className="text-sm text-[#9fe3b8]" data-testid="stylist-book-message">
            {message}
          </p>
        ) : null}
      </form>
    </main>
  );
}
