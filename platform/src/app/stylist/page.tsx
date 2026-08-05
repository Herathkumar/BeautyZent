"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { WalkInPanel } from "@/components/WalkInPanel";
import { centsToDollars, promptCompleteAmounts } from "@/lib/pay";

type Appt = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  source: string;
  notes: string | null;
  chargedCents?: number | null;
  tipCents?: number | null;
  client: { name: string; phone: string | null };
  service: { name: string; priceCents?: number; durationMin?: number };
};

function statusLabel(status: string) {
  switch (status) {
    case "BOOKED":
      return "Waiting";
    case "CHECKED_IN":
      return "Here";
    case "COMPLETED":
      return "Done";
    case "CANCELLED":
      return "Cancelled";
    case "NO_SHOW":
      return "No show";
    default:
      return status;
  }
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDay(d: Date) {
  return d.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function phoneHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export default function StylistHomePage() {
  const [name, setName] = useState("");
  const [stylistId, setStylistId] = useState("");
  const [photoUrl, setPhotoUrl] = useState("/avatars/stylist-neutral.svg");
  const [hasPhoto, setHasPhoto] = useState(false);
  const [appointments, setAppointments] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [walkInOpen, setWalkInOpen] = useState(false);

  const load = useCallback(async () => {
    const me = await fetch("/api/stylist/me");
    if (me.status === 401) {
      window.location.href = "/stylist/login";
      return;
    }
    const meData = await me.json();
    setName(meData.stylist?.name || meData.user?.name || "");
    setStylistId(meData.stylist?.id || "");
    if (meData.stylist?.photoUrl) setPhotoUrl(meData.stylist.photoUrl);
    setHasPhoto(Boolean(meData.stylist?.hasPhoto));

    const res = await fetch("/api/stylist/appointments?days=14");
    const data = await res.json();
    setAppointments(data.appointments || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  const { today, upcoming, doneToday } = useMemo(() => {
    const now = new Date();
    const todayList: Appt[] = [];
    const upcomingList: Appt[] = [];
    let done = 0;
    for (const a of appointments) {
      const start = new Date(a.startsAt);
      if (isSameDay(start, now)) {
        todayList.push(a);
        if (a.status === "COMPLETED") done += 1;
      } else if (start > now && a.status !== "CANCELLED") {
        upcomingList.push(a);
      }
    }
    todayList.sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    );
    upcomingList.sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    );
    return { today: todayList, upcoming: upcomingList, doneToday: done };
  }, [appointments]);

  const nextOpen = today.find((a) => ["BOOKED", "CHECKED_IN"].includes(a.status));

  async function setStatus(id: string, status: string, defaultPriceCents = 0) {
    if (status === "CANCELLED" && !window.confirm("Cancel this booking?")) return;
    let chargedCents: number | undefined;
    let tipCents: number | undefined;
    if (status === "COMPLETED") {
      const amounts = promptCompleteAmounts(defaultPriceCents);
      if (!amounts) return;
      chargedCents = amounts.chargedCents;
      tipCents = amounts.tipCents;
    }
    setBusyId(id);
    await fetch("/api/stylist/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, chargedCents, tipCents }),
    });
    await load();
    setBusyId(null);
  }

  function AppointmentCard({ a, emphasize }: { a: Appt; emphasize?: boolean }) {
    const active = ["BOOKED", "CHECKED_IN"].includes(a.status);
    return (
      <article
        className={`rounded-2xl border p-4 ${
          emphasize
            ? "border-[rgba(240,201,135,0.55)] bg-[linear-gradient(135deg,#3d2b22_0%,#2a211c_100%)]"
            : "border-ink/15 bg-cream"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-[family-name:var(--font-display)] text-2xl text-champagne">
              {formatTime(a.startsAt)}
              <span className="ml-2 text-sm font-normal text-muted">
                – {formatTime(a.endsAt)}
              </span>
            </p>
            <p className="mt-1 text-xl font-semibold">
              {a.client.name}
              {a.source === "WALK_IN" ? (
                <span
                  data-testid="walk-in-badge"
                  className="ml-2 align-middle rounded-full bg-[rgba(240,201,135,0.18)] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#f0c987] uppercase"
                >
                  Walk-in
                </span>
              ) : null}
            </p>
            <p className="text-sm text-muted">{a.service.name}</p>
            {a.status === "COMPLETED" ? (
              <p className="mt-2 text-base font-semibold text-[#f0c987]">
                $
                {centsToDollars(
                  a.chargedCents ?? a.service.priceCents ?? 0
                )}{" "}
                charged
                {(a.tipCents ?? 0) > 0 ? (
                  <span className="text-[#9fe3b8]">
                    {" "}
                    · +${centsToDollars(a.tipCents ?? 0)} tip
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
              a.status === "CHECKED_IN"
                ? "bg-[rgba(159,227,184,0.18)] text-[#9fe3b8]"
                : a.status === "COMPLETED"
                  ? "bg-[rgba(201,168,124,0.15)] text-champagne"
                  : a.status === "CANCELLED" || a.status === "NO_SHOW"
                    ? "bg-[rgba(245,168,168,0.15)] text-[#f5a8a8]"
                    : "bg-[rgba(240,201,135,0.12)] text-champagne"
            }`}
          >
            {statusLabel(a.status)}
          </span>
        </div>

        {a.notes ? (
          <p className="mt-3 rounded-xl border border-[rgba(240,201,135,0.25)] bg-[rgba(240,201,135,0.08)] px-3 py-2 text-sm text-champagne">
            <span className="font-semibold">Note · </span>
            {a.notes}
          </p>
        ) : null}

        <div className="mt-4 grid gap-2">
          {a.client.phone ? (
            <a
              href={phoneHref(a.client.phone)}
              className="stylist-tap flex items-center justify-center rounded-2xl border border-ink/20 text-champagne"
            >
              Call {a.client.phone}
            </a>
          ) : null}

          {active ? (
            <div className="grid grid-cols-2 gap-2">
              {a.status === "BOOKED" ? (
                <button
                  type="button"
                  disabled={busyId === a.id}
                  onClick={() => setStatus(a.id, "CHECKED_IN")}
                  className="stylist-tap btn-solid col-span-2 rounded-2xl"
                >
                  Client is here
                </button>
              ) : null}
              <button
                type="button"
                disabled={busyId === a.id}
                onClick={() => setStatus(a.id, "COMPLETED", a.service.priceCents || 0)}
                className={`stylist-tap rounded-2xl border border-ink/20 ${
                  a.status === "CHECKED_IN" ? "btn-solid col-span-2" : ""
                }`}
              >
                Done
              </button>
              {a.status === "BOOKED" ? (
                <button
                  type="button"
                  disabled={busyId === a.id}
                  onClick={() => setStatus(a.id, "CANCELLED")}
                  className="stylist-tap rounded-2xl border border-[rgba(245,168,168,0.45)] text-[#f5a8a8]"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </article>
    );
  }

  if (loading) {
    return <p className="py-16 text-center text-muted">Loading your day…</p>;
  }

  return (
    <main className="space-y-8">
      <header className="flex items-start gap-4">
        <Link
          href="/stylist/account"
          className="shrink-0"
          aria-label="Update your booking photo"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt=""
            width={64}
            height={64}
            data-testid="stylist-home-photo"
            className="h-16 w-16 rounded-full object-cover ring-2 ring-champagne/40"
          />
        </Link>
        <div className="min-w-0 space-y-1">
          <p className="text-sm uppercase tracking-[0.18em] text-champagne">
            {formatDay(new Date())}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">
            Hi{name ? `, ${name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-muted">
            {today.length === 0
              ? "No clients today — enjoy the quiet."
              : `${today.length} today · ${doneToday} done`}
            {nextOpen
              ? ` · next at ${formatTime(nextOpen.startsAt)}`
              : today.length > 0
                ? " · all wrapped up"
                : ""}
          </p>
          <p className="pt-1 text-sm">
            <Link href="/stylist/account" className="text-champagne underline-offset-2 hover:underline">
              {hasPhoto ? "Change booking photo" : "Add selfie for online booking"}
            </Link>
          </p>
        </div>
      </header>

      <section className="space-y-3 rounded-2xl border border-ink/15 bg-cream p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
              Floor board
            </h2>
            <p className="text-sm text-muted">
              Open the store display, or seat a walk-in / waitlist guest here.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/stylist/display"
              className="rounded-full bg-champagne px-3 py-2 text-sm font-semibold text-[#1c1714]"
              data-testid="stylist-store-display-link"
            >
              Store display
            </Link>
            <button
              type="button"
              onClick={() => setWalkInOpen((v) => !v)}
              className="rounded-full border border-ink/20 px-3 py-2 text-sm font-semibold text-champagne"
              data-testid="stylist-walk-in-toggle"
            >
              {walkInOpen ? "Hide form" : "Add walk-in"}
            </button>
          </div>
        </div>
        {stylistId ? (
          <WalkInPanel
            mode="stylist"
            lockedStylistId={stylistId}
            lockedStylistName={name}
            showForm={walkInOpen}
            showWaitlist
            pollMs={30_000}
            onCreated={() => void load()}
          />
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Today</h2>
        {today.length === 0 ? (
          <div className="rounded-2xl border border-ink/15 bg-cream px-4 py-8 text-center text-muted">
            Nothing on the book for today.
          </div>
        ) : (
          today.map((a) => (
            <AppointmentCard key={a.id} a={a} emphasize={a.id === nextOpen?.id} />
          ))
        )}
      </section>

      {upcoming.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Coming up
          </h2>
          <div className="divide-y divide-ink/10 overflow-hidden rounded-2xl border border-ink/15 bg-cream">
            {upcoming.slice(0, 12).map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{a.client.name}</p>
                  <p className="text-sm text-muted">
                    {new Date(a.startsAt).toLocaleString("en-CA", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    · {a.service.name}
                  </p>
                  {a.notes ? (
                    <p className="truncate text-xs text-champagne">Note: {a.notes}</p>
                  ) : null}
                </div>
                {a.client.phone ? (
                  <a
                    href={phoneHref(a.client.phone)}
                    className="shrink-0 rounded-full border border-ink/20 px-3 py-2 text-sm font-semibold text-champagne"
                  >
                    Call
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <p className="pb-2 text-center text-xs text-muted">
        Tip: on iPhone, Share → Add to Home Screen for a one-tap app icon.
      </p>
    </main>
  );
}
