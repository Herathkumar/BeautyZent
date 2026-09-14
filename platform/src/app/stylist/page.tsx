"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import {
  StylistCalendar,
  StylistChipAvatar,
  type CalendarView,
} from "@/components/stylist/StylistCalendar";
import { StylistBookingSheet } from "@/components/stylist/StylistBookingSheet";
import {
  LotusMark,
  StylistAddWaitlistSheet,
  StylistWaitlistSheet,
} from "@/components/stylist/StylistWaitlistSheet";
import { stylistAvatarTone } from "@/lib/stylist-calendar-colors";
import { calendarDateInTz } from "@/lib/salon-time";
import { centsToDollars, promptCompleteAmounts } from "@/lib/pay";
import { clampDisplayHours } from "@/lib/display-schedule";

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

type TeamStylist = { id: string; name: string; photoUrl?: string | null };

function statusLabel(status: string) {
  switch (status) {
    case "BOOKED":
      return "Waiting";
    case "CHECKED_IN":
      return "Checked in";
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
  const [salonName, setSalonName] = useState("BeautyZent Studio");
  const [salonSlug, setSalonSlug] = useState("");
  const [salonTz, setSalonTz] = useState("America/Toronto");
  const [openHour, setOpenHour] = useState(9);
  const [closeHour, setCloseHour] = useState(18);
  const [photoUrl, setPhotoUrl] = useState("/avatars/stylist-neutral.svg");
  const [hasPhoto, setHasPhoto] = useState(false);
  const [team, setTeam] = useState<TeamStylist[]>([]);
  const [appointments, setAppointments] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const confirm = useConfirm();
  const [view, setView] = useState<CalendarView>("day");
  const [selectedYmd, setSelectedYmd] = useState(() =>
    calendarDateInTz("America/Toronto")
  );
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [addWaitlistOpen, setAddWaitlistOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingPreset, setBookingPreset] = useState<{
    clientName?: string;
    clientPhone?: string | null;
    serviceId?: string | null;
    note?: string | null;
  } | null>(null);
  const [styleViewer, setStyleViewer] = useState<{
    url: string;
    label: string;
  } | null>(null);

  const load = useCallback(async () => {
    const [me, res, wait] = await Promise.all([
      fetch("/api/stylist/me"),
      fetch("/api/stylist/appointments?days=45&lookback=14"),
      fetch("/api/stylist/waitlist"),
    ]);
    if (me.status === 401 || res.status === 401) {
      window.location.href = "/stylist/login";
      return;
    }
    const [meData, data, waitData] = await Promise.all([
      me.json(),
      res.json(),
      wait.ok ? wait.json() : Promise.resolve({ waitlist: [] }),
    ]);
    setName(meData.stylist?.name || meData.user?.name || "");
    setStylistId(meData.stylist?.id || "");
    setSalonName(meData.stylist?.salon?.name || "BeautyZent Studio");
    setSalonSlug(meData.stylist?.salon?.slug || "");
    const tz = meData.stylist?.salon?.timezone || "America/Toronto";
    setSalonTz(tz);
    setSelectedYmd((prev) => prev || calendarDateInTz(tz));
    const hours = clampDisplayHours(
      meData.stylist?.salon?.openHour,
      meData.stylist?.salon?.closeHour
    );
    setOpenHour(hours.openHour);
    setCloseHour(hours.closeHour);
    if (meData.stylist?.photoUrl) setPhotoUrl(meData.stylist.photoUrl);
    setHasPhoto(Boolean(meData.stylist?.hasPhoto));
    setAppointments(data.appointments || []);
    setWaitlistCount((waitData.waitlist || []).length);

    const slug = meData.stylist?.salon?.slug;
    if (slug) {
      try {
        const cat = await fetch(`/api/public/${slug}/catalog`).then((r) => r.json());
        const others = ((cat.stylists || []) as { id: string; name: string }[])
          .filter((s) => s.id !== meData.stylist?.id)
          .slice(0, 5)
          .map((s) => ({ id: s.id, name: s.name }));
        setTeam(others);
      } catch {
        setTeam([]);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const selectedAppt =
    appointments.find(
      (a) => a.id === selectedId && ["BOOKED", "CHECKED_IN"].includes(a.status)
    ) || null;

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
      if (status === "COMPLETED" || status === "CANCELLED") setSelectedId(null);
    } catch {
      setAppointments(previous);
      setActionError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusyId(null);
    }
  }

  const calendarAppts = useMemo(
    () =>
      appointments.map((a) => ({
        id: a.id,
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        status: a.status,
        source: a.source,
        client: a.client,
        service: a.service,
      })),
    [appointments]
  );

  if (loading) {
    return <p className="py-16 text-center text-muted">Loading your calendar…</p>;
  }

  return (
    <main className="bz-home space-y-4 pb-24">
      <header className="bz-home__header">
        <div className="flex items-center justify-between gap-3">
          <button type="button" className="bz-icon-btn" aria-label="Menu" onClick={() => {}}>
            ☰
          </button>
          <div className="text-center">
            <LotusMark className="mx-auto h-7 w-7 text-champagne" />
            <p className="font-[family-name:var(--font-display)] text-xl tracking-tight text-champagne">
              {salonName || "Stylist"}
            </p>
          </div>
          <Link href="/stylist/account" className="bz-icon-btn" aria-label="Location / profile">
            ⌖
          </Link>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            className="text-left"
            onClick={() => setSelectedYmd(calendarDateInTz(salonTz))}
          >
            <p className="text-sm font-semibold text-[color:var(--bz-ink)]">
              {new Date(`${selectedYmd}T12:00:00`).toLocaleDateString("en-CA", {
                timeZone: salonTz,
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <p className="text-xs text-[color:var(--bz-muted)]">{salonName}</p>
          </button>
          <button
            type="button"
            className="bz-waitlist-badge"
            data-testid="stylist-waitlist-badge"
            onClick={() => setWaitlistOpen(true)}
          >
            Waitlist {waitlistCount}
          </button>
        </div>

        <div className="bz-stylist-row mt-4" data-testid="stylist-team-row">
          <StylistChipAvatar
            name={name || "You"}
            photoUrl={photoUrl}
            selected
            tone="#f5efe6"
            label="You"
          />
          {team.map((s, i) => (
            <StylistChipAvatar
              key={s.id}
              name={s.name}
              tone={stylistAvatarTone(i)}
              label={s.name.split(" ")[0]}
            />
          ))}
        </div>
      </header>

      <StylistCalendar
        view={view}
        selectedYmd={selectedYmd}
        timeZone={salonTz}
        openHour={openHour}
        closeHour={closeHour}
        appointments={calendarAppts}
        selectedId={selectedId}
        now={now}
        onSelectDate={setSelectedYmd}
        onSelectAppointment={setSelectedId}
        onChangeView={setView}
      />

      <p className="px-1 text-center text-xs text-[color:var(--bz-muted)]">
        <Link href="/stylist/account" className="underline-offset-2 hover:underline">
          {hasPhoto ? "Change booking photo" : "Add selfie for online booking"}
        </Link>
        {salonSlug ? ` · ${salonSlug}` : ""}
      </p>

      <button
        type="button"
        className="bz-fab"
        aria-label="New booking"
        data-testid="stylist-book-for-client"
        onClick={() => {
          setBookingPreset(null);
          setBookingOpen(true);
        }}
      >
        +
      </button>

      {selectedAppt ? (
        <>
          <button
            type="button"
            className="bz-sheet-backdrop"
            aria-label="Dismiss check in"
            onClick={() => setSelectedId(null)}
          />
          <div
            className="bz-sheet"
            data-testid="stylist-checkin-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={`Check in ${selectedAppt.client.name}`}
          >
            <div className="bz-sheet__handle" />
            <div className="bz-sheet__head">
              <p className="text-sm font-semibold uppercase tracking-wider text-[color:var(--bz-muted)]">
                Check in
              </p>
              <button type="button" className="bz-icon-btn" onClick={() => setSelectedId(null)}>
                ×
              </button>
            </div>
            {actionError ? <p className="bz-sheet__error">{actionError}</p> : null}
            <article className="bz-wait-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-[family-name:var(--font-display)] text-2xl text-champagne">
                    {formatTime(selectedAppt.startsAt, salonTz)}
                    <span className="ml-2 text-sm font-normal text-[color:var(--bz-muted)]">
                      – {formatTime(selectedAppt.endsAt, salonTz)}
                    </span>
                  </p>
                  <p className="mt-1 text-xl font-semibold">{selectedAppt.client.name}</p>
                  <p className="text-sm text-[color:var(--bz-muted)]">
                    {selectedAppt.service.name}
                  </p>
                </div>
                <span className="bz-tag is-priority">{statusLabel(selectedAppt.status)}</span>
              </div>
              {selectedAppt.stylePref?.url ? (
                <button
                  type="button"
                  className="mt-3 flex w-full gap-3 rounded-xl bg-[#f7f5f2] p-2.5 text-left"
                  onClick={() =>
                    setStyleViewer({
                      url: selectedAppt.stylePref!.url,
                      label: `${selectedAppt.client.name} · preferred look`,
                    })
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedAppt.stylePref.url}
                    alt=""
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <span className="text-sm">
                    <span className="font-semibold text-champagne">
                      Client preferred look
                    </span>
                    <span className="mt-1 block text-xs text-[color:var(--bz-muted)]">
                      Tap to enlarge
                    </span>
                  </span>
                </button>
              ) : null}
              {selectedAppt.notes ? (
                <p className="mt-3 rounded-xl bg-[#f7f5f2] px-3 py-2 text-sm">
                  <span className="font-semibold">Note · </span>
                  {selectedAppt.notes}
                </p>
              ) : null}
              <div className="mt-4 grid gap-2">
                {selectedAppt.client.phone ? (
                  <a
                    href={phoneHref(selectedAppt.client.phone)}
                    className="bz-btn-ghost text-center"
                  >
                    Call {selectedAppt.client.phone}
                  </a>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  {selectedAppt.status === "BOOKED" ? (
                    <button
                      type="button"
                      disabled={busyId === selectedAppt.id}
                      onClick={() => setStatus(selectedAppt.id, "CHECKED_IN")}
                      className="bz-btn-gold col-span-2"
                    >
                      {busyId === selectedAppt.id ? "Checking in…" : "Check in"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busyId === selectedAppt.id}
                    onClick={() =>
                      setStatus(
                        selectedAppt.id,
                        "COMPLETED",
                        selectedAppt.service.priceCents || 0
                      )
                    }
                    className={
                      selectedAppt.status === "CHECKED_IN"
                        ? "bz-btn-gold col-span-2"
                        : "bz-btn-ghost"
                    }
                  >
                    {busyId === selectedAppt.id && selectedAppt.status === "CHECKED_IN"
                      ? "Saving…"
                      : "Done"}
                    {selectedAppt.status === "COMPLETED"
                      ? ` · $${centsToDollars(selectedAppt.chargedCents ?? 0)}`
                      : ""}
                  </button>
                  {selectedAppt.status === "BOOKED" ? (
                    <button
                      type="button"
                      disabled={busyId === selectedAppt.id}
                      onClick={() => setStatus(selectedAppt.id, "CANCELLED")}
                      className="bz-btn-ghost text-[color:#b85a4a]"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          </div>
        </>
      ) : null}

      <StylistWaitlistSheet
        open={waitlistOpen}
        onClose={() => setWaitlistOpen(false)}
        onAdd={() => {
          setWaitlistOpen(false);
          setAddWaitlistOpen(true);
        }}
        onBook={(entry) => {
          setWaitlistOpen(false);
          setBookingPreset({
            clientName: entry.clientName,
            clientPhone: entry.clientPhone,
            serviceId: entry.service?.id,
            note: entry.note,
          });
          setBookingOpen(true);
        }}
        onChanged={() => void load()}
      />

      <StylistAddWaitlistSheet
        open={addWaitlistOpen}
        onClose={() => setAddWaitlistOpen(false)}
        onCreated={() => void load()}
        defaultStylistId={stylistId}
      />

      <StylistBookingSheet
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        onCreated={() => void load()}
        preset={bookingPreset}
      />

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
              className="shrink-0 rounded-full bg-[color:var(--t-accent-strong)] px-4 py-2 text-sm font-semibold text-[color:var(--t-on-accent)]"
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
    </main>
  );
}
