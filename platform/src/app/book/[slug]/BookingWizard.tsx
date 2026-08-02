"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCad } from "@/lib/money";

type Service = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  durationMin: number;
  priceCents: number;
};
type Stylist = {
  id: string;
  name: string;
  bio: string | null;
  color: string;
  serviceIds: string[];
};
type Salon = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
};

export function BookingWizard({ slug }: { slug: string }) {
  const [salon, setSalon] = useState<Salon | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [stylistId, setStylistId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<string[]>([]);
  const [startsAt, setStartsAt] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{
    stylist: string;
    service: string;
    startsAt: string;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/public/${slug}/catalog`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setSalon(data.salon);
        setServices(data.services);
        setStylists(data.stylists);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const filteredStylists = useMemo(() => {
    if (!serviceId) return stylists;
    return stylists.filter((s) => s.serviceIds.includes(serviceId));
  }, [stylists, serviceId]);

  useEffect(() => {
    if (!serviceId || !stylistId || !date) {
      setSlots([]);
      return;
    }
    const q = new URLSearchParams({ serviceId, stylistId, date });
    fetch(`/api/public/${slug}/slots?${q}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots || []))
      .catch(() => setSlots([]));
  }, [slug, serviceId, stylistId, date]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/public/${slug}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          stylistId,
          startsAt,
          clientName: name,
          clientPhone: phone,
          clientEmail: email,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed");
      setDone({
        stylist: data.appointment.stylist,
        service: data.appointment.service,
        startsAt: data.appointment.startsAt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-muted">Loading booking…</p>;
  if (done) {
    return (
      <div className="rounded-3xl border border-ink/10 bg-cream p-8 shadow-lg">
        <p className="text-xs font-semibold tracking-[0.18em] text-cocoa uppercase">Confirmed</p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl">You&apos;re booked</h2>
        <p className="mt-4 text-muted">
          {done.service} with {done.stylist}
          <br />
          {new Date(done.startsAt).toLocaleString("en-CA", {
            weekday: "long",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
        {salon?.phone && (
          <p className="mt-4 text-sm text-muted">
            Questions? Call <a className="font-medium text-cocoa" href={`tel:${salon.phone}`}>{salon.phone}</a>
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">1. Choose a service</h2>
        <div className="grid gap-3">
          {services.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setServiceId(s.id);
                setStylistId("");
                setStartsAt("");
              }}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                serviceId === s.id
                  ? "border-ink bg-ink text-cream"
                  : "border-ink/15 bg-cream hover:border-ink/40"
              }`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium">{s.name}</span>
                <span className="text-sm opacity-80">{formatCad(s.priceCents)}</span>
              </div>
              <p className={`mt-1 text-sm ${serviceId === s.id ? "text-cream/75" : "text-muted"}`}>
                {s.durationMin} min · {s.category === "WOMEN" ? "Women" : s.category === "MEN" ? "Men" : "Service"}
              </p>
            </button>
          ))}
        </div>
      </section>

      {serviceId && (
        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">2. Choose your stylist</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredStylists.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setStylistId(s.id);
                  setStartsAt("");
                }}
                className={`rounded-2xl border px-4 py-3 text-left ${
                  stylistId === s.id
                    ? "border-ink bg-ink text-cream"
                    : "border-ink/15 bg-cream hover:border-ink/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ background: s.color }}
                  />
                  <span className="font-medium">{s.name}</span>
                </div>
                {s.bio && (
                  <p className={`mt-1 text-sm ${stylistId === s.id ? "text-cream/75" : "text-muted"}`}>
                    {s.bio}
                  </p>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {stylistId && (
        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">3. Pick a time</h2>
          <input
            type="date"
            value={date}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => {
              setDate(e.target.value);
              setStartsAt("");
            }}
            className="w-full rounded-xl border border-ink/15 bg-cream px-3 py-2"
          />
          <div className="flex flex-wrap gap-2">
            {slots.length === 0 && (
              <p className="text-sm text-muted">No open slots this day. Try another date.</p>
            )}
            {slots.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => setStartsAt(slot)}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  startsAt === slot ? "bg-ink text-cream" : "border border-ink/20 bg-cream"
                }`}
              >
                {new Date(slot).toLocaleTimeString("en-CA", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </button>
            ))}
          </div>
        </section>
      )}

      {startsAt && (
        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">4. Your details</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              Name
              <input required value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl border border-ink/15 bg-cream px-3 py-2" />
            </label>
            <label className="grid gap-1 text-sm">
              Phone
              <input required value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl border border-ink/15 bg-cream px-3 py-2" />
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              Email (optional)
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl border border-ink/15 bg-cream px-3 py-2" />
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              Notes (optional)
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="rounded-xl border border-ink/15 bg-cream px-3 py-2" />
            </label>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-ink px-5 py-3 font-medium text-cream hover:bg-cocoa disabled:opacity-60"
          >
            {submitting ? "Booking…" : "Confirm reservation"}
          </button>
        </section>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>
  );
}
