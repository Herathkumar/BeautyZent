"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCad } from "@/lib/money";
import { calendarDateInTz } from "@/lib/salon-time";

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
  gender?: string;
  photoUrl?: string;
  hasPhoto?: boolean;
  serviceIds: string[];
};
type Salon = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  timezone?: string;
  today?: string;
};

const STEPS = ["Service", "Stylist", "Time", "Details"] as const;

export function BookingWizard({ slug }: { slug: string }) {
  const [salon, setSalon] = useState<Salon | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [stylistId, setStylistId] = useState("");
  const [minDate, setMinDate] = useState(() => calendarDateInTz("America/Toronto"));
  const [date, setDate] = useState(() => calendarDateInTz("America/Toronto"));
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
        const today =
          data.salon?.today ||
          calendarDateInTz(data.salon?.timezone || "America/Toronto");
        setMinDate(today);
        setDate((prev) => (prev < today ? today : prev));
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

  const activeStep = !serviceId
    ? 0
    : !stylistId
      ? 1
      : !startsAt
        ? 2
        : 3;

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

  if (loading) {
    return <p className="py-12 text-center text-muted">Loading booking…</p>;
  }

  if (done) {
    return (
      <div className="book-card rounded-3xl p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
        <p className="text-xs font-semibold tracking-[0.22em] text-champagne uppercase">
          Confirmed
        </p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl">
          You&apos;re booked
        </h2>
        <p className="mx-auto mt-4 max-w-md text-lg text-muted">
          {done.service} with {done.stylist}
          <br />
          <span className="mt-2 inline-block text-[#f2c4b0]">
            {new Date(done.startsAt).toLocaleString("en-CA", {
              weekday: "long",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </p>
        {salon?.phone ? (
          <p className="mt-6 text-sm text-muted">
            Questions?{" "}
            <a className="font-semibold text-champagne" href={`tel:${salon.phone}`}>
              Call {salon.phone}
            </a>
          </p>
        ) : null}
        <p className="mt-4 text-xs text-muted">
          See you at the salon — we&apos;ll have your chair ready.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className="btn-solid rounded-2xl px-5 py-3.5 text-sm font-semibold"
            onClick={() => {
              setDone(null);
              setServiceId("");
              setStylistId("");
              setStartsAt("");
              setNotes("");
              setError("");
            }}
          >
            Book another
          </button>
          <a
            href="https://www.fhsalon.ca"
            className="rounded-2xl border border-[rgba(232,180,162,0.4)] px-5 py-3.5 text-sm font-semibold text-[#f2c4b0] transition hover:bg-[rgba(232,180,162,0.12)]"
          >
            Visit our website
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <div className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <span
            key={label}
            className={`book-step ${
              i === activeStep ? "is-active" : i < activeStep ? "is-done" : ""
            }`}
          >
            <span aria-hidden>{i < activeStep ? "✓" : i + 1}</span>
            {label}
          </span>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Choose a service</h2>
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
              className={`book-card rounded-2xl px-4 py-4 text-left ${
                serviceId === s.id ? "is-selected" : ""
              }`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-lg font-semibold">{s.name}</span>
                <span className="text-sm text-champagne">{formatCad(s.priceCents)}</span>
              </div>
              <p className="mt-1 text-sm text-muted">
                {s.durationMin} min ·{" "}
                {s.category === "WOMEN" ? "Women" : s.category === "MEN" ? "Men" : "Service"}
              </p>
              {s.description ? (
                <p className="mt-2 text-sm text-white/65">{s.description}</p>
              ) : null}
            </button>
          ))}
        </div>
      </section>

      {serviceId ? (
        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">Choose your stylist</h2>
          {filteredStylists.length === 0 ? (
            <div className="book-card rounded-2xl px-4 py-5 text-sm text-muted">
              No stylist is set up for this service yet. Please call{" "}
              {salon?.phone ? (
                <a className="font-semibold text-champagne" href={`tel:${salon.phone}`}>
                  {salon.phone}
                </a>
              ) : (
                "the salon"
              )}{" "}
              or pick another service.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredStylists.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setStylistId(s.id);
                    setStartsAt("");
                  }}
                  className={`book-card rounded-2xl px-4 py-4 text-left ${
                    stylistId === s.id ? "is-selected" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.photoUrl || "/avatars/stylist-neutral.svg"}
                      alt={`${s.name} photo`}
                      width={56}
                      height={56}
                      className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-[#f2c4b0]/35"
                    />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-semibold">
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-[#f2c4b0]/50"
                          style={{ background: s.color }}
                          aria-hidden
                        />
                        {s.name}
                      </p>
                      {s.bio ? <p className="mt-1 text-sm text-muted">{s.bio}</p> : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {stylistId ? (
        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">Pick a time</h2>
          <input
            type="date"
            value={date}
            min={minDate}
            onChange={(e) => {
              setDate(e.target.value);
              setStartsAt("");
            }}
            className="w-full rounded-2xl border border-ink/15 px-4 py-3"
          />
          <div className="flex flex-wrap gap-2">
            {slots.length === 0 ? (
              <p className="text-sm text-muted">No open slots this day. Try another date.</p>
            ) : null}
            {slots.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => setStartsAt(slot)}
                className={`book-slot rounded-full px-4 py-2.5 text-sm ${
                  startsAt === slot ? "is-selected" : ""
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
      ) : null}

      {startsAt ? (
        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">Your details</h2>
          <div className="book-card grid gap-3 rounded-2xl p-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm">
              Name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl border px-3 py-2.5"
                autoComplete="name"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              Phone
              <input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-xl border px-3 py-2.5"
                autoComplete="tel"
                inputMode="tel"
              />
            </label>
            <label className="grid gap-1.5 text-sm sm:col-span-2">
              Email (optional)
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border px-3 py-2.5"
                autoComplete="email"
              />
            </label>
            <label className="grid gap-1.5 text-sm sm:col-span-2">
              Notes for your stylist (optional)
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="e.g. haircut with head massage"
                className="rounded-xl border px-3 py-2.5"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="btn-solid w-full rounded-2xl px-5 py-4 text-base font-semibold disabled:opacity-60 sm:w-auto"
          >
            {submitting ? "Booking…" : "Confirm reservation"}
          </button>
        </section>
      ) : null}

      {error ? <p className="text-sm text-[#f5a8a8]">{error}</p> : null}
    </form>
  );
}
