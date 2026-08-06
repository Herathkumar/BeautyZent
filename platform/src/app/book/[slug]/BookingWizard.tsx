"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ANY_STYLIST_ID, CLIENT_CANCEL_HOURS } from "@/lib/client-booking";
import { formatCad } from "@/lib/money";
import { calendarDateInTz } from "@/lib/salon-time";
import { BookingMyBookings } from "./BookingMyBookings";
import { BookThemePicker } from "./BookThemePicker";
import { BookClient, ClientMemberBar } from "./ClientMemberBar";

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

function PostBookJoin({
  slug,
  name,
  phone,
  email,
  onJoined,
  onSkip,
}: {
  slug: string;
  name: string;
  phone: string;
  email: string;
  onJoined: (c: BookClient) => void;
  onSkip: () => void;
}) {
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function sendCode() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/public/${slug}/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "join", name, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send code");
      setSent(true);
      if (data.demoCode) setDemoCode(data.demoCode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/public/${slug}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not verify");
      onJoined(data.client);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not verify");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="book-card rounded-3xl p-5">
      <p className="text-xs font-semibold tracking-[0.16em] text-champagne uppercase">
        Save your profile?
      </p>
      <h3 className="mt-1 font-[family-name:var(--font-display)] text-2xl">
        Join for easier booking next time
      </h3>
      <p className="mt-2 text-sm text-muted">
        One-time code to {email}. No password. Free cancel until {CLIENT_CANCEL_HOURS}h before.
      </p>
      {!sent ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={sendCode}
            className="btn-solid rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {busy ? "Sending…" : "Email me a code"}
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-muted"
          >
            Skip for now
          </button>
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {demoCode ? (
            <p className="rounded-xl border border-[rgba(232,180,162,0.35)] bg-[rgba(232,180,162,0.1)] px-3 py-2 text-sm text-[#f2c4b0]">
              Demo code: <span className="font-bold tracking-widest">{demoCode}</span>
            </p>
          ) : (
            <p className="text-sm text-muted">Check your inbox for the code.</p>
          )}
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="rounded-xl border px-3 py-2.5 tracking-[0.35em]"
            inputMode="numeric"
            placeholder="6-digit code"
          />
          <button
            type="button"
            disabled={busy || code.length !== 6}
            onClick={verify}
            className="btn-solid rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {busy ? "Saving…" : "Join & save"}
          </button>
        </div>
      )}
      {error ? <p className="mt-3 text-sm text-[#f5a8a8]">{error}</p> : null}
    </div>
  );
}

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
  const [saveAsMember, setSaveAsMember] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [client, setClient] = useState<BookClient | null>(null);
  const [showBookings, setShowBookings] = useState(false);
  const [joinPrompt, setJoinPrompt] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [done, setDone] = useState<{
    id: string;
    stylist: string;
    service: string;
    startsAt: string;
    priceCents?: number;
  } | null>(null);

  const onClientChange = useCallback((c: BookClient | null) => {
    setClient(c);
    if (c) {
      setName(c.name || "");
      setPhone(c.phone || "");
      setEmail(c.email || "");
      return;
    }
    // Guest again — clear prefilled member details and member-only UI
    setName("");
    setPhone("");
    setEmail("");
    setShowBookings(false);
    setSaveAsMember(true);
  }, []);

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

  const selectedService = services.find((s) => s.id === serviceId) || null;
  const selectedStylist =
    stylistId === ANY_STYLIST_ID
      ? null
      : stylists.find((s) => s.id === stylistId) || null;

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

  useEffect(() => {
    if (!client?.preferredStylistId || stylistId || !serviceId) return;
    const pref = filteredStylists.find((s) => s.id === client.preferredStylistId);
    if (pref) setStylistId(pref.id);
  }, [client, filteredStylists, serviceId, stylistId]);

  const activeStep = !serviceId
    ? 0
    : !stylistId
      ? 1
      : !startsAt
        ? 2
        : 3;

  function goToStep(i: number) {
    if (i <= 0) {
      setServiceId("");
      setStylistId("");
      setStartsAt("");
      return;
    }
    if (i === 1) {
      setStylistId("");
      setStartsAt("");
      return;
    }
    if (i === 2) {
      setStartsAt("");
    }
  }

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
          saveAsMember: !client && saveAsMember,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Booking failed");
      setDone({
        id: data.appointment.id,
        stylist: data.appointment.stylist,
        service: data.appointment.service,
        startsAt: data.appointment.startsAt,
        priceCents: data.appointment.priceCents,
      });
      setJoinPrompt(Boolean(data.suggestJoin && saveAsMember && email));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
  }

  function pickNextSlot() {
    if (slots[0]) setStartsAt(slots[0]);
  }

  if (loading) {
    return <p className="py-12 text-center text-muted">Loading booking…</p>;
  }

  if (done) {
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      `${done.service} at ${salon?.name || "Salon"}`
    )}&dates=${new Date(done.startsAt)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z")}/${new Date(
      new Date(done.startsAt).getTime() + (selectedService?.durationMin || 30) * 60000
    )
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z")}`;

    return (
      <div className="space-y-5" data-testid="booking-confirmed">
        <div className="book-card rounded-3xl p-7 text-center shadow-[0_20px_60px_rgba(0,0,0,0.3)] sm:p-8">
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
                timeZone: salon?.timezone,
              })}
            </span>
          </p>
          <p className="mt-3 text-xs text-muted">
            Ref · {done.id.slice(-8).toUpperCase()} · Free cancel until {CLIENT_CANCEL_HOURS}h
            before
          </p>
          {salon?.phone ? (
            <p className="mt-5 text-sm text-muted">
              Questions?{" "}
              <a className="font-semibold text-champagne" href={`tel:${salon.phone}`}>
                Call {salon.phone}
              </a>
            </p>
          ) : null}
        </div>

        {joinPrompt && !client ? (
          <PostBookJoin
            slug={slug}
            name={name}
            phone={phone}
            email={email}
            onJoined={(c) => {
              onClientChange(c);
              setJoinPrompt(false);
              setThemeOpen(true);
            }}
            onSkip={() => setJoinPrompt(false)}
          />
        ) : null}

        <section className="book-card rounded-3xl p-5 sm:p-6" data-testid="booking-next-steps">
          <p className="text-xs font-semibold tracking-[0.18em] text-champagne uppercase">
            What&apos;s next
          </p>
          <h3 className="mt-1 font-[family-name:var(--font-display)] text-2xl">
            {client ? `Welcome back, ${client.name.split(" ")[0]}` : "While you wait"}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {client
              ? "Manage this visit, book again, or tweak how booking looks on this device."
              : "Save the date, book someone else, or join so your details are ready next time."}
          </p>

          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            <a
              href={calendarUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-solid rounded-2xl px-4 py-3.5 text-center text-sm font-semibold"
            >
              Add to calendar
            </a>
            <button
              type="button"
              className="rounded-2xl border border-[rgba(232,180,162,0.4)] px-4 py-3.5 text-sm font-semibold text-champagne"
              onClick={() => {
                setDone(null);
                setJoinPrompt(false);
                setServiceId("");
                setStylistId("");
                setStartsAt("");
                setNotes("");
                setError("");
              }}
            >
              Book another
            </button>

            {client ? (
              <button
                type="button"
                onClick={() => setShowBookings(true)}
                className="rounded-2xl border border-[rgba(232,180,162,0.4)] px-4 py-3.5 text-sm font-semibold text-champagne"
              >
                View my bookings
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setJoinPrompt(true);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="rounded-2xl border border-[rgba(232,180,162,0.4)] px-4 py-3.5 text-sm font-semibold text-champagne"
              >
                Join free — no password
              </button>
            )}

            <button
              type="button"
              onClick={() => setThemeOpen(true)}
              className="rounded-2xl border border-[rgba(232,180,162,0.4)] px-4 py-3.5 text-sm font-semibold text-champagne"
            >
              Appearance
            </button>

            {salon?.phone ? (
              <a
                href={`tel:${salon.phone}`}
                className="rounded-2xl border border-[rgba(232,180,162,0.4)] px-4 py-3.5 text-center text-sm font-semibold text-champagne"
              >
                Call the salon
              </a>
            ) : null}

            <a
              href={
                process.env.NEXT_PUBLIC_MARKETING_URL || "https://www.fhsalon.ca"
              }
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-[rgba(232,180,162,0.4)] px-4 py-3.5 text-center text-sm font-semibold text-champagne sm:col-span-2"
            >
              Visit salon website
            </a>
          </div>
        </section>

        <BookingMyBookings
          slug={slug}
          open={showBookings}
          onClose={() => setShowBookings(false)}
          timezone={salon?.timezone}
        />
        <BookThemePicker
          open={themeOpen}
          title={
            client
              ? "Choose your booking look"
              : "Booking is available in light & dark mode!"
          }
          subtitle="Light, dark, or match your device — saved on this phone."
          confirmLabel="Save"
          onClose={() => setThemeOpen(false)}
        />
      </div>
    );
  }

  return (
    <>
      <ClientMemberBar
        slug={slug}
        client={client}
        onClientChange={onClientChange}
        onOpenBookings={() => setShowBookings(true)}
      />

      <form onSubmit={submit} className="space-y-8 pb-28">
        <div className="flex flex-wrap gap-2">
          {STEPS.map((label, i) => {
            const reachable = i === 0 || (i === 1 && serviceId) || (i === 2 && stylistId) || (i === 3 && startsAt) || i < activeStep;
            return (
              <button
                key={label}
                type="button"
                disabled={!reachable && i > activeStep}
                onClick={() => {
                  if (i < activeStep) goToStep(i);
                }}
                className={`book-step ${
                  i === activeStep ? "is-active" : i < activeStep ? "is-done" : ""
                }`}
              >
                <span aria-hidden>{i < activeStep ? "✓" : i + 1}</span>
                {label}
              </button>
            );
          })}
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
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="font-[family-name:var(--font-display)] text-2xl">
                Choose your stylist
              </h2>
              {selectedService ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-champagne underline-offset-2 hover:underline"
                  onClick={() => goToStep(0)}
                >
                  Change service
                </button>
              ) : null}
            </div>
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
                <button
                  type="button"
                  onClick={() => {
                    setStylistId(ANY_STYLIST_ID);
                    setStartsAt("");
                  }}
                  className={`book-card rounded-2xl px-4 py-4 text-left sm:col-span-2 ${
                    stylistId === ANY_STYLIST_ID ? "is-selected" : ""
                  }`}
                >
                  <p className="font-semibold">Any available stylist</p>
                  <p className="mt-1 text-sm text-muted">
                    We’ll match you to the first open chair for your time.
                  </p>
                </button>
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
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="font-[family-name:var(--font-display)] text-2xl">Pick a time</h2>
              <button
                type="button"
                className="text-xs font-semibold text-champagne underline-offset-2 hover:underline"
                onClick={() => goToStep(1)}
              >
                Change stylist
              </button>
            </div>
            <input
              type="date"
              value={date}
              min={minDate}
              onChange={(e) => {
                const next = e.target.value;
                if (!next) return;
                setDate(next);
                setStartsAt("");
              }}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker?.();
                } catch {
                  /* native icon still works */
                }
              }}
              className="w-full rounded-2xl border border-ink/15 px-4 py-3"
            />
            {slots.length > 0 ? (
              <button
                type="button"
                onClick={pickNextSlot}
                className="rounded-full border border-[rgba(232,180,162,0.4)] px-4 py-2 text-xs font-semibold text-[#f2c4b0]"
              >
                Next available ·{" "}
                {new Date(slots[0]).toLocaleTimeString("en-CA", {
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: salon?.timezone || "America/Toronto",
                })}
              </button>
            ) : null}
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
                    timeZone: salon?.timezone || "America/Toronto",
                  })}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {startsAt ? (
          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-display)] text-2xl">Your details</h2>
            {client ? (
              <p className="text-sm text-[#f2c4b0]">
                Signed in as {client.name} — details filled for you.
              </p>
            ) : (
              <p className="text-sm text-muted">
                Booking as guest is fine. You can join anytime with email OTP.
              </p>
            )}
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
                Email {client ? "" : "(recommended)"}
                <input
                  type="email"
                  required={saveAsMember && !client}
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
              {!client ? (
                <label className="flex items-start gap-2 text-sm text-muted sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={saveAsMember}
                    onChange={(e) => setSaveAsMember(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    Save my profile after booking (email code — no password). Cancel free until{" "}
                    {CLIENT_CANCEL_HOURS}h before.
                  </span>
                </label>
              ) : null}
            </div>
          </section>
        ) : null}

        {error ? <p className="text-sm text-[#f5a8a8]">{error}</p> : null}

        {(selectedService || selectedStylist || stylistId === ANY_STYLIST_ID || startsAt) && (
          <div className="book-sticky-summary">
            <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0 text-sm">
                <p className="truncate font-semibold text-white">
                  {[
                    selectedService?.name,
                    stylistId === ANY_STYLIST_ID
                      ? "Any stylist"
                      : selectedStylist?.name,
                    startsAt
                      ? new Date(startsAt).toLocaleString("en-CA", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          timeZone: salon?.timezone,
                        })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {selectedService ? (
                  <p className="text-xs text-[#f2c4b0]">{formatCad(selectedService.priceCents)}</p>
                ) : null}
              </div>
              {startsAt ? (
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-solid shrink-0 rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-60"
                >
                  {submitting ? "Booking…" : "Confirm reservation"}
                </button>
              ) : (
                <span className="text-xs text-muted">Keep going →</span>
              )}
            </div>
          </div>
        )}
      </form>

      <BookingMyBookings
        slug={slug}
        open={showBookings}
        onClose={() => setShowBookings(false)}
        timezone={salon?.timezone}
      />
    </>
  );
}
