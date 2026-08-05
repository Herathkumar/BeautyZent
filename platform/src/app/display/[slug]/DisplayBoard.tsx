"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DisplayPinPad } from "@/components/DisplayPinPad";
import { WalkInPanel } from "@/components/WalkInPanel";
import { ZentraLabFooter } from "@/components/ZentraLabFooter";
import { promptCompleteAmounts } from "@/lib/pay";

type Appt = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  source?: string;
  notes: string | null;
  chargedCents?: number | null;
  tipCents?: number | null;
  client: { name: string; phone: string | null };
  service: { name: string; priceCents?: number };
  stylist: { name: string; color: string };
};

type SalonInfo = {
  name: string;
  slug: string;
  phone?: string | null;
  address?: string | null;
};

type Tab = "today" | "future";

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayKey() {
  return dayKey(new Date().toISOString());
}

function dayLabel(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const tKey = todayKey();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = dayKey(tomorrow.toISOString());

  const formatted = date.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  if (key === tKey) return `Today · ${formatted}`;
  if (key === tomorrowKey) return `Tomorrow · ${formatted}`;
  return formatted;
}

const STATUS_STYLES: Record<string, string> = {
  BOOKED: "bg-[#3d2b22] text-[#f0c987]",
  CHECKED_IN: "bg-[#2a4a3a] text-[#9fe3b8]",
  COMPLETED: "bg-white/10 text-white/60",
  CANCELLED: "bg-white/10 text-red-200/80",
  NO_SHOW: "bg-[#3d2b22] text-[#f0c987]",
};

function AppointmentActions({
  a,
  onStatus,
}: {
  a: Appt;
  onStatus: (id: string, status: string, chargedCents?: number, tipCents?: number) => void;
}) {
  if (["COMPLETED", "CANCELLED", "NO_SHOW"].includes(a.status)) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {a.status === "BOOKED" && (
        <button
          type="button"
          onClick={() => onStatus(a.id, "CHECKED_IN")}
          className="rounded-full bg-[#c9a87c] px-3 py-2 text-sm font-medium text-[#1c1714]"
        >
          Check in
        </button>
      )}
      {["BOOKED", "CHECKED_IN"].includes(a.status) && (
        <button
          type="button"
          onClick={() => {
            const amounts = promptCompleteAmounts(a.service.priceCents || 0);
            if (!amounts) return;
            onStatus(a.id, "COMPLETED", amounts.chargedCents, amounts.tipCents);
          }}
          className="rounded-full border border-white/30 px-3 py-2 text-sm"
        >
          Done
        </button>
      )}
      {["BOOKED", "CHECKED_IN"].includes(a.status) && (
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Mark this booking as no-show?")) {
              onStatus(a.id, "NO_SHOW");
            }
          }}
          className="rounded-full border border-[#c9a87c]/50 px-3 py-2 text-sm text-[#f0c987]"
        >
          No show
        </button>
      )}
      <button
        type="button"
        onClick={() => onStatus(a.id, "CANCELLED")}
        className="rounded-full border border-red-300/40 px-3 py-2 text-sm text-red-200"
      >
        Cancel
      </button>
    </div>
  );
}

function StylistLine({ a }: { a: Appt }) {
  return (
    <div className="space-y-1">
      <p className="flex flex-wrap items-center gap-x-2 text-white/80">
        <span>{a.service.name}</span>
        <span className="text-white/40">·</span>
        <span className="inline-flex items-center gap-1.5 font-bold text-[#f0c987]">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-[#f0c987]/50"
            style={{ background: a.stylist.color }}
            aria-hidden
          />
          {a.stylist.name}
        </span>
      </p>
      {a.notes ? (
        <p className="rounded-lg bg-black/25 px-2.5 py-1.5 text-sm text-[#f0c987]/95">
          <span className="font-semibold text-white/70">Note: </span>
          {a.notes}
        </p>
      ) : null}
    </div>
  );
}

export function DisplayBoard({
  slug,
  /** When true, board sits inside manager chrome (not the tablet URL). */
  embedded = false,
}: {
  slug: string;
  embedded?: boolean;
}) {
  const [appointments, setAppointments] = useState<Appt[]>([]);
  const [salon, setSalon] = useState<SalonInfo | null>(null);
  const [days, setDays] = useState(14);
  const [tab, setTab] = useState<Tab>("today");
  const [now, setNow] = useState(() => new Date());
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [walkInWaiting, setWalkInWaiting] = useState(0);
  const [needsPin, setNeedsPin] = useState(false);
  const [pinSet, setPinSet] = useState(false);
  const [unlockChecked, setUnlockChecked] = useState(false);

  const onWaitlistChange = useCallback((count: number) => {
    setWalkInWaiting(count);
  }, []);

  const checkUnlock = useCallback(async () => {
    try {
      const res = await fetch(`/api/display/${slug}/unlock`);
      const data = await res.json();
      if (data.salon) setSalon(data.salon);
      setPinSet(Boolean(data.pinSet));
      setNeedsPin(Boolean(data.needsPin));
    } catch {
      setNeedsPin(false);
      setPinSet(false);
    } finally {
      setUnlockChecked(true);
    }
  }, [slug]);

  const load = useCallback(() => {
    if (needsPin) return;
    fetch(`/api/display/${slug}/today?days=${days}`)
      .then(async (r) => {
        const data = await r.json();
        if (r.status === 401 && data.needsPin) {
          setNeedsPin(true);
          return;
        }
        setAppointments(data.appointments || []);
        setSalon(data.salon || null);
      })
      .catch(() => undefined);
  }, [slug, days, needsPin]);

  useEffect(() => {
    void checkUnlock();
  }, [checkUnlock]);

  useEffect(() => {
    if (!unlockChecked || needsPin) return;
    load();
    const poll = setInterval(load, 15000);
    const clock = setInterval(() => setNow(new Date()), 30000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [load, unlockChecked, needsPin]);

  const tKey = todayKey();
  /** Floor list: open bookings only — hide completed / no-show / cancelled */
  const todayAppts = useMemo(
    () =>
      appointments.filter(
        (a) =>
          dayKey(a.startsAt) === tKey &&
          (a.status === "BOOKED" || a.status === "CHECKED_IN")
      ),
    [appointments, tKey]
  );
  const futureGrouped = useMemo(() => {
    const map = new Map<string, Appt[]>();
    for (const a of appointments) {
      const key = dayKey(a.startsAt);
      if (key === tKey) continue;
      if (a.status === "COMPLETED" || a.status === "NO_SHOW") continue;
      const list = map.get(key) || [];
      list.push(a);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [appointments, tKey]);
  const futureCount = useMemo(
    () => futureGrouped.reduce((n, [, list]) => n + list.length, 0),
    [futureGrouped]
  );

  async function setStatus(
    id: string,
    status: string,
    chargedCents?: number,
    tipCents?: number
  ) {
    const res = await fetch(`/api/display/${slug}/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, chargedCents, tipCents }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && data.needsPin) {
      setNeedsPin(true);
      return;
    }
    load();
  }

  async function lockTablet() {
    await fetch(`/api/display/${slug}/unlock`, { method: "DELETE" });
    setAppointments([]);
    await checkUnlock();
  }

  const waiting = todayAppts.filter(
    (a) => a.status === "BOOKED" && (a.source || "ONLINE") !== "WALK_IN"
  ).length;
  const inChair = todayAppts.filter((a) => a.status === "CHECKED_IN").length;

  if (!unlockChecked) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-[#1c1714] text-sm text-white/60">
        Loading store display…
      </div>
    );
  }

  if (needsPin && !embedded) {
    return (
      <DisplayPinPad
        slug={slug}
        salonName={salon?.name}
        onUnlocked={() => {
          setNeedsPin(false);
          setUnlockChecked(true);
        }}
      />
    );
  }

  if (needsPin && embedded) {
    return (
      <div className="rounded-3xl border border-[#c9a87c]/30 bg-[#2a211c] p-6 text-sm text-[#d4c4b0]">
        Store display PIN is set. Sign in as manager to use the board here, or open the tablet
        URL and enter the PIN.
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col ${embedded ? "min-h-[70vh] overflow-hidden rounded-3xl border border-[#c9a87c]/25" : "min-h-screen"} bg-[#1c1714] text-[#fffaf6]`}
      data-testid={embedded ? "manager-store-display-board" : "store-display-board"}
    >
      <header className="border-b border-white/10 px-6 py-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.2em] text-[#c9a87c] uppercase">
              {embedded ? "Store display" : "Salon floor"}
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-4xl">
              {salon?.name || "Bookings"}
            </h1>
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className="text-xl text-white/70">
              {now.toLocaleString("en-CA", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
            {!embedded && pinSet ? (
              <button
                type="button"
                onClick={() => void lockTablet()}
                className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white/70 hover:text-white"
              >
                Lock tablet
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-full border border-white/15 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setTab("today")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                tab === "today"
                  ? "bg-[#c9a87c] text-[#1c1714]"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Today
              <span className="ml-2 opacity-80">({todayAppts.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("future")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                tab === "future"
                  ? "bg-[#c9a87c] text-[#1c1714]"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Future
              <span className="ml-2 opacity-80">({futureCount})</span>
            </button>
          </div>

          {tab === "future" && (
            <div className="flex items-center gap-2 text-sm text-white/60">
              <span>Range</span>
              <div className="flex rounded-full border border-white/20 p-0.5">
                {[7, 14, 30].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setDays(n)}
                    className={`rounded-full px-3 py-1 ${
                      days === n
                        ? "bg-[#c9a87c] font-medium text-[#1c1714]"
                        : "text-[#fffaf6]/80 hover:bg-white/10"
                    }`}
                  >
                    {n}d
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {tab === "today" && (
        <div className="px-6 py-6">
          {/* Promo band */}
          <section className="relative mb-6 overflow-hidden rounded-3xl border border-[#c9a87c]/35 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <div className="absolute inset-0">
              <img
                src="/display-promo.jpg"
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#1c1714]/95 via-[#1c1714]/75 to-[#6e4a38]/45" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(240,201,135,0.35),transparent_45%)]" />
            </div>
            <div className="relative grid gap-6 p-6 md:grid-cols-[1.2fr_auto] md:items-end md:p-8">
              <div>
                <p className="text-xs font-semibold tracking-[0.22em] text-[#f0c987] uppercase">
                  Prefer a set time?
                </p>
                <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl leading-none md:text-5xl">
                  Book online
                </h2>
                <p className="mt-3 max-w-xl text-base text-white/80 md:text-lg">
                  Reserve your favourite stylist ahead of time at{" "}
                  <span className="font-semibold text-[#f0c987]">www.fhsalon.ca</span>
                </p>
                <p className="mt-1.5 max-w-xl text-base text-white/80 md:text-lg">
                  Walk-ins welcome when a chair is open
                </p>
                {(salon?.phone || salon?.address) && (
                  <p className="mt-3 text-sm text-[#f0c987]/90">
                    {salon.phone}
                    {salon.phone && salon.address ? " · " : ""}
                    {salon.address}
                  </p>
                )}
              </div>
              <div
                className="grid grid-cols-3 gap-3 md:min-w-[300px]"
                data-testid="display-floor-counts"
              >
                <div className="rounded-2xl bg-[#f0c987] px-3 py-3 sm:px-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide !text-[#3d2b22]/85 sm:text-xs">
                    Online
                  </p>
                  <p
                    className="font-[family-name:var(--font-display)] text-3xl !text-[#1c1714]"
                    data-testid="display-count-waiting"
                  >
                    {waiting}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-tight !text-[#3d2b22]/75">
                    Booked ahead
                  </p>
                </div>
                <div className="rounded-2xl bg-[#e8c4a0] px-3 py-3 sm:px-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide !text-[#3d2b22]/85 sm:text-xs">
                    Walk-in
                  </p>
                  <p
                    className="font-[family-name:var(--font-display)] text-3xl !text-[#1c1714]"
                    data-testid="display-count-walk-in"
                  >
                    {walkInWaiting}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-tight !text-[#3d2b22]/75">
                    On waitlist
                  </p>
                </div>
                <div className="rounded-2xl bg-[#9fe3b8] px-3 py-3 sm:px-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide !text-[#0f2a1c]/85 sm:text-xs">
                    In chair
                  </p>
                  <p
                    className="font-[family-name:var(--font-display)] text-3xl !text-[#123022]"
                    data-testid="display-count-in-chair"
                  >
                    {inChair}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* In-store waitlist — under welcome, until seated */}
          <section
            className="mb-6 rounded-3xl border border-[#c9a87c]/30 bg-[#241c18]/80 p-4 md:p-5"
            data-testid="display-waitlist-section"
          >
            <WalkInPanel
              mode="display"
              slug={slug}
              showForm={false}
              showWaitlist
              pollMs={15_000}
              onCreated={load}
              onWaitlistChange={onWaitlistChange}
            />
          </section>

          <section className="mb-6 rounded-3xl border border-[#c9a87c]/30 bg-[#241c18]/80 p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl">
                  Walk-in desk
                </h2>
                <p className="text-sm text-white/65">
                  Seat a guest now, or add them to the waitlist.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWalkInOpen((v) => !v)}
                className="rounded-full bg-[#c9a87c] px-4 py-2 text-sm font-semibold text-[#1c1714]"
                data-testid="display-walk-in-toggle"
              >
                {walkInOpen ? "Hide form" : "Add walk-in"}
              </button>
            </div>
            {walkInOpen ? (
              <div className="mt-4">
                <WalkInPanel
                  mode="display"
                  slug={slug}
                  showForm
                  showWaitlist={false}
                  onCreated={load}
                />
              </div>
            ) : null}
          </section>

          {/* Today bookings — colourful cards */}
          <div className="grid gap-4">
            {todayAppts.length === 0 && (
              <p className="rounded-2xl border border-dashed border-[#c9a87c]/40 bg-gradient-to-br from-[#3d2b22]/80 to-[#1c1714] p-10 text-center text-white/70">
                No bookings yet today — enjoy a quiet moment, or take a walk-in.
              </p>
            )}
            {todayAppts.map((a, index) => {
              const accents = [
                "from-[#5a3a2a] to-[#2a1c16] border-[#c9a87c]/40",
                "from-[#3a2f4a] to-[#1c1714] border-[#b8a0d8]/35",
                "from-[#2a3f3a] to-[#1c1714] border-[#9fe3b8]/35",
                "from-[#4a3520] to-[#1c1714] border-[#f0c987]/40",
              ];
              const accent = accents[index % accents.length];
              return (
                <article
                  key={a.id}
                  className={`grid gap-3 rounded-2xl border bg-gradient-to-r p-4 shadow-lg md:grid-cols-[160px_1fr_auto] md:items-center ${accent}`}
                >
                  <div>
                    <p className="text-3xl font-semibold tracking-tight">
                      {new Date(a.startsAt).toLocaleTimeString("en-CA", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-sm text-white/55">
                      {new Date(a.endsAt).toLocaleTimeString("en-CA", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{a.client.name}</p>
                    <StylistLine a={a} />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${
                          STATUS_STYLES[a.status] || STATUS_STYLES.BOOKED
                        }`}
                      >
                        {a.status.replace("_", " ")}
                      </span>
                      {a.source === "WALK_IN" ? (
                        <span
                          data-testid="walk-in-badge"
                          className="inline-block rounded-full bg-[#f0c987]/20 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-[#f0c987] uppercase"
                        >
                          Walk-in
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <AppointmentActions a={a} onStatus={setStatus} />
                </article>
              );
            })}
          </div>
        </div>
      )}

      {tab === "future" && (
        <div className="grid gap-8 px-6 py-6">
          {futureGrouped.length === 0 && (
            <p className="rounded-2xl border border-white/10 p-8 text-white/60">
              No upcoming bookings in this range.
            </p>
          )}

          {futureGrouped.map(([key, list]) => (
            <section key={key} className="space-y-3">
              <h2 className="text-sm tracking-[0.16em] text-[#c9a87c] uppercase">
                {dayLabel(key)}
              </h2>
              <div className="grid gap-3">
                {list.map((a) => (
                  <article
                    key={a.id}
                    className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-[160px_1fr_auto] md:items-center"
                  >
                    <div>
                      <p className="text-2xl font-medium">
                        {new Date(a.startsAt).toLocaleTimeString("en-CA", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-sm text-white/50">
                        {new Date(a.endsAt).toLocaleTimeString("en-CA", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xl font-medium">{a.client.name}</p>
                      <StylistLine a={a} />
                      <p className="mt-1 text-xs tracking-wide text-[#c9a87c] uppercase">
                        {a.status}
                      </p>
                    </div>
                    <AppointmentActions a={a} onStatus={setStatus} />
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <ZentraLabFooter />
    </div>
  );
}
