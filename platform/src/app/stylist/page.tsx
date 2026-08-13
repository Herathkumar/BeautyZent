"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { WalkInPanel } from "@/components/WalkInPanel";
import { useConfirm } from "@/components/ConfirmDialog";
import { calendarDateInTz } from "@/lib/salon-time";
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
  stylePref?: {
    id: string;
    source: string;
    prompt: string | null;
    url: string;
  } | null;
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

function isSameDay(a: Date, b: Date, timeZone: string) {
  return calendarDateInTz(timeZone, a) === calendarDateInTz(timeZone, b);
}

function formatDay(d: Date, timeZone: string) {
  return d.toLocaleDateString("en-CA", {
    timeZone,
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string, timeZone: string) {
  return new Date(iso).toLocaleTimeString("en-CA", {
    timeZone,
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
  const [salonTz, setSalonTz] = useState("America/Toronto");
  const [photoUrl, setPhotoUrl] = useState("/avatars/stylist-neutral.svg");
  const [hasPhoto, setHasPhoto] = useState(false);
  const [appointments, setAppointments] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const confirm = useConfirm();
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [styleViewer, setStyleViewer] = useState<{
    url: string;
    label: string;
  } | null>(null);

  const load = useCallback(async () => {
    const [me, res] = await Promise.all([
      fetch("/api/stylist/me"),
      fetch("/api/stylist/appointments?days=14"),
    ]);
    if (me.status === 401 || res.status === 401) {
      window.location.href = "/stylist/login";
      return;
    }
    const [meData, data] = await Promise.all([me.json(), res.json()]);
    setName(meData.stylist?.name || meData.user?.name || "");
    setStylistId(meData.stylist?.id || "");
    setSalonTz(meData.stylist?.salon?.timezone || "America/Toronto");
    if (meData.stylist?.photoUrl) setPhotoUrl(meData.stylist.photoUrl);
    setHasPhoto(Boolean(meData.stylist?.hasPhoto));
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
      if (isSameDay(start, now, salonTz)) {
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
  }, [appointments, salonTz]);

  const nextOpen = today.find((a) => ["BOOKED", "CHECKED_IN"].includes(a.status));

  async function setStatus(id: string, status: string, defaultPriceCents = 0) {
    if (status === "CANCELLED") {
      const ok = await confirm({
        title: "Cancel booking?",
        message: "This appointment will be cancelled.",
        confirmLabel: "Cancel booking",
        cancelLabel: "Keep it",
        tone: "danger",
      });
      if (!ok) return;
    }
    let chargedCents: number | undefined;
    let tipCents: number | undefined;
    if (status === "COMPLETED") {
      const amounts = promptCompleteAmounts(defaultPriceCents);
      if (!amounts) return;
      chargedCents = amounts.chargedCents;
      tipCents = amounts.tipCents;
    }
    const previous = appointments;
    setActionError("");
    setBusyId(id);
    setAppointments((list) =>
      list.map((a) => (a.id === id ? { ...a, status, chargedCents, tipCents } : a))
    );
    try {
      const res = await fetch("/api/stylist/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, chargedCents, tipCents }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAppointments(previous);
        setActionError(data.error || "Could not update this booking. Try again.");
        return;
      }
      await load();
    } catch {
      setAppointments(previous);
      setActionError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusyId(null);
    }
  }

  function AppointmentCard({ a, emphasize }: { a: Appt; emphasize?: boolean }) {
    const active = ["BOOKED", "CHECKED_IN"].includes(a.status);
    return (
      <article
        className={`stylist-appt-card rounded-2xl border p-4 ${
          emphasize ? "stylist-appt-card--focus" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-[family-name:var(--font-display)] text-2xl text-champagne">
              {formatTime(a.startsAt, salonTz)}
              <span className="ml-2 text-sm font-normal text-muted">
                – {formatTime(a.endsAt, salonTz)}
              </span>
            </p>
            <p className="mt-1 text-xl font-semibold text-ink">
              {a.client.name}
              {a.source === "WALK_IN" ? (
                <span
                  data-testid="walk-in-badge"
                  className="ml-2 align-middle rounded-full bg-[color:rgb(var(--t-accent-rgb)/0.18)] px-2 py-0.5 text-[10px] font-bold tracking-wide text-champagne uppercase"
                >
                  Walk-in
                </span>
              ) : null}
            </p>
            <p className="text-sm text-muted">{a.service.name}</p>
            {a.status === "COMPLETED" ? (
              <p className="mt-2 text-base font-semibold text-champagne">
                $
                {centsToDollars(
                  a.chargedCents ?? a.service.priceCents ?? 0
                )}{" "}
                charged
                {(a.tipCents ?? 0) > 0 ? (
                  <span className="text-[color:var(--t-ok)]">
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
                ? "bg-[color:color-mix(in_srgb,var(--t-ok)_18%,transparent)] text-[color:var(--t-ok)]"
                : a.status === "COMPLETED"
                  ? "bg-[color:rgb(var(--t-accent-rgb)/0.15)] text-champagne"
                  : a.status === "CANCELLED" || a.status === "NO_SHOW"
                    ? "bg-[color:color-mix(in_srgb,var(--t-danger)_15%,transparent)] text-[color:var(--t-danger)]"
                    : "bg-[color:rgb(var(--t-accent-rgb)/0.12)] text-champagne"
            }`}
          >
            {statusLabel(a.status)}
          </span>
        </div>

        {a.stylePref?.url ? (
          <button
            type="button"
            onClick={() =>
              setStyleViewer({
                url: a.stylePref!.url,
                label: `${a.client.name} · preferred look`,
              })
            }
            className="mt-3 flex w-full gap-3 rounded-xl border border-[color:rgb(var(--t-accent-rgb)/0.25)] bg-[color:rgb(var(--t-accent-rgb)/0.08)] p-2.5 text-left"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={a.stylePref.url}
              alt="Client preferred look"
              className="h-20 w-20 shrink-0 rounded-lg object-cover"
            />
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-champagne">Client preferred look</p>
              <p className="mt-0.5 text-xs text-muted">
                {a.stylePref.source === "AI"
                  ? "AI style preview"
                  : a.stylePref.source === "LOOKBOOK"
                    ? "From their look book"
                    : "Uploaded photo"}
                {a.stylePref.prompt ? ` · ${a.stylePref.prompt}` : ""}
              </p>
              <p className="mt-1 text-xs font-semibold text-champagne">Tap to enlarge</p>
            </div>
          </button>
        ) : null}

        {a.notes ? (
          <p className="mt-3 rounded-xl border border-[color:rgb(var(--t-accent-rgb)/0.25)] bg-[color:rgb(var(--t-accent-rgb)/0.08)] px-3 py-2 text-sm text-champagne">
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
                  {busyId === a.id ? "Checking in…" : "Check in"}
                </button>
              ) : null}
              <button
                type="button"
                disabled={busyId === a.id}
                onClick={() => setStatus(a.id, "COMPLETED", a.service.priceCents || 0)}
                className={`stylist-tap rounded-2xl border border-ink/20 text-ink ${
                  a.status === "CHECKED_IN" ? "btn-solid col-span-2" : ""
                }`}
              >
                {busyId === a.id && a.status === "CHECKED_IN" ? "Saving…" : "Done"}
              </button>
              {a.status === "BOOKED" ? (
                <button
                  type="button"
                  disabled={busyId === a.id}
                  onClick={() => setStatus(a.id, "CANCELLED")}
                  className="stylist-tap rounded-2xl border border-[color:color-mix(in_srgb,var(--t-danger)_45%,transparent)] text-[color:var(--t-danger)]"
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
            {formatDay(new Date(), salonTz)}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">
            Hi{name ? `, ${name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-muted">
            {today.length === 0
              ? "No clients today — enjoy the quiet."
              : `${today.length} today · ${doneToday} done`}
            {nextOpen
              ? ` · next at ${formatTime(nextOpen.startsAt, salonTz)}`
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

      <section className="stylist-appt-card space-y-3 rounded-2xl border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
              Floor board
            </h2>
            <p className="text-sm text-muted">
              Book a client ahead, or seat a walk-in / waitlist guest.
            </p>
          </div>
          <div className="relative z-10 flex flex-wrap gap-2">
            <a
              href="/stylist/book"
              className="stylist-btn-primary inline-flex rounded-full px-3 py-2 text-sm"
              data-testid="stylist-book-for-client"
            >
              Book for client
            </a>
            <button
              type="button"
              onClick={() => setWalkInOpen((v) => !v)}
              className="stylist-btn-secondary rounded-full px-3 py-2 text-sm"
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
        {actionError ? (
          <p className="rounded-xl border border-[color:color-mix(in_srgb,var(--t-danger)_35%,transparent)] px-3 py-2 text-sm text-[color:var(--t-danger)]">
            {actionError}
          </p>
        ) : null}
        {today.length === 0 ? (
          <div className="stylist-appt-card rounded-2xl border px-4 py-8 text-center text-muted">
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
          <div className="stylist-appt-card divide-y divide-ink/10 overflow-hidden rounded-2xl border">
            {upcoming.slice(0, 12).map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  {a.stylePref?.url ? (
                    <button
                      type="button"
                      onClick={() =>
                        setStyleViewer({
                          url: a.stylePref!.url,
                          label: `${a.client.name} · preferred look`,
                        })
                      }
                      className="shrink-0"
                      title="View preferred look"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={a.stylePref.url}
                        alt=""
                        className="h-12 w-12 rounded-lg object-cover ring-1 ring-[rgba(181,235,224,0.35)]"
                      />
                    </button>
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{a.client.name}</p>
                    <p className="text-sm text-muted">
                      {new Date(a.startsAt).toLocaleString("en-CA", {
                        timeZone: salonTz,
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
                    {a.stylePref ? (
                      <p className="truncate text-xs text-[#b5ebe0]">
                        Preferred look
                        {a.stylePref.prompt ? ` · ${a.stylePref.prompt}` : ""}
                      </p>
                    ) : null}
                  </div>
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

      {styleViewer ? (
        <div
          className="fixed inset-0 z-[80] flex flex-col bg-black/92"
          role="dialog"
          aria-modal="true"
          aria-label={styleViewer.label}
        >
          <div className="flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
            <p className="min-w-0 truncate text-sm font-semibold text-white">
              {styleViewer.label}
            </p>
            <button
              type="button"
              onClick={() => setStyleViewer(null)}
              className="shrink-0 rounded-full bg-[#b5ebe0] px-4 py-2 text-sm font-semibold text-[#0e1618]"
            >
              Close
            </button>
          </div>
          <button
            type="button"
            className="flex min-h-0 flex-1 items-center justify-center px-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
            onClick={() => setStyleViewer(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={styleViewer.url}
              alt={styleViewer.label}
              className="max-h-full max-w-full object-contain"
            />
          </button>
        </div>
      ) : null}

      <p className="pb-2 text-center text-xs text-muted">
        Tip: on iPhone, Share → Add to Home Screen for a one-tap app icon.
      </p>
    </main>
  );
}
