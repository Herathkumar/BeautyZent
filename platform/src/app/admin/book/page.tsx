"use client";

import { useEffect, useState } from "react";
import { calendarDateInTz } from "@/lib/salon-time";

type Service = { id: string; name: string; durationMin: number; priceCents: number };
type Stylist = { id: string; name: string; serviceIds: string[] };

export default function AdminBookPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [slug, setSlug] = useState("fhsalon");
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

  useEffect(() => {
    fetch("/api/admin/stylists")
      .then((r) => {
        if (r.status === 401) {
          window.location.href = "/admin/login";
          return null;
        }
        return r.json();
      })
      .then(async (stylistData) => {
        if (!stylistData) return;
        // Load public catalog for service↔stylist mapping via default slug
        const cat = await fetch(`/api/public/${slug}/catalog`).then((r) => r.json());
        setSlug(cat.salon?.slug || slug);
        setServices(cat.services || []);
        setStylists(cat.stylists || []);
        const today =
          cat.salon?.today ||
          calendarDateInTz(cat.salon?.timezone || "America/Toronto");
        setMinDate(today);
        setDate((prev) => (prev < today ? today : prev));
      });
  }, []);

  useEffect(() => {
    if (!serviceId || !stylistId || !date) {
      setSlots([]);
      return;
    }
    const q = new URLSearchParams({ serviceId, stylistId, date });
    fetch(`/api/public/${slug}/slots?${q}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots || []));
  }, [slug, serviceId, stylistId, date]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    const res = await fetch("/api/admin/appointments/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stylistId,
        serviceId,
        startsAt,
        clientName,
        clientPhone,
        notes,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : "Could not book");
      return;
    }
    setMessage(`Booked ${data.appointment.client.name} with ${data.appointment.stylist.name}`);
    setStartsAt("");
    setClientName("");
    setClientPhone("");
    setNotes("");
  }

  const filteredStylists = serviceId
    ? stylists.filter((s) => s.serviceIds.includes(serviceId))
    : stylists;

  return (
    <main className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Book for a client</h1>
        <p className="text-muted">
          Admin / front desk can schedule any stylist. Slots respect stylist hours and leave.
        </p>
      </div>

      <form onSubmit={submit} className="grid max-w-xl gap-4 rounded-2xl border border-ink/10 bg-cream p-5">
        <label className="grid gap-1 text-sm">
          Service
          <select
            required
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              setStylistId("");
              setStartsAt("");
            }}
            className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink"
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
          >
            <option value="">Select…</option>
            {filteredStylists.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
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
              setDate(e.target.value);
              setStartsAt("");
            }}
            className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink"
          />
        </label>

        <div>
          <p className="mb-2 text-sm">Available slots</p>
          <div className="flex flex-wrap gap-2">
            {slots.length === 0 && (
              <p className="text-sm text-muted">No open slots (check stylist schedule / leave).</p>
            )}
            {slots.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => setStartsAt(slot)}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  startsAt === slot ? "bg-ink text-[#fffaf6]" : "border border-ink/20"
                }`}
              >
                {new Date(slot).toLocaleTimeString("en-CA", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </button>
            ))}
          </div>
        </div>

        <label className="grid gap-1 text-sm">
          Client name
          <input
            required
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Client phone
          <input
            required
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink"
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
          disabled={!startsAt}
          className="btn-solid rounded-full px-5 py-3 disabled:opacity-50"
        >
          Create booking
        </button>
        {message && <p className="text-sm text-cocoa">{message}</p>}
      </form>
    </main>
  );
}
