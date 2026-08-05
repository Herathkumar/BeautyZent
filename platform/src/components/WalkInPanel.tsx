"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { centsToDollars } from "@/lib/pay";

type Service = {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
  stylistIds?: string[];
};
type Stylist = { id: string; name: string };
type NextOpt = {
  stylistId: string;
  stylistName: string;
  startsAt: string;
  endsAt: string;
  waitMinutes: number;
};
type WaitEntry = {
  id: string;
  clientName: string;
  clientPhone: string | null;
  estimatedWaitMin: number | null;
  note: string | null;
  service: { id: string; name: string } | null;
  stylist: { id: string; name: string } | null;
  nextAvailable?: NextOpt | null;
  availableOptions?: NextOpt[];
};

type Props = {
  mode: "manager" | "display" | "stylist";
  /** Required for display mode */
  slug?: string;
  /** When stylist mode, lock form to this stylist */
  lockedStylistId?: string;
  lockedStylistName?: string;
  /** Show the seat / add form (default true) */
  showForm?: boolean;
  /** Show the waitlist list (default true) */
  showWaitlist?: boolean;
  /** Poll waitlist while mounted (display board) */
  pollMs?: number;
  onCreated?: () => void;
};

function formatWait(min: number | null | undefined) {
  if (min == null) return "—";
  const n = Math.max(0, min);
  if (n <= 0) return "Ready now";
  if (n < 60) return `~${n} min wait`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m ? `~${h}h ${m}m wait` : `~${h}h wait`;
}

export function WalkInPanel({
  mode,
  slug,
  lockedStylistId,
  lockedStylistName,
  showForm = true,
  showWaitlist = true,
  pollMs,
  onCreated,
}: Props) {
  const includeWaitlist = showWaitlist;
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [stylistId, setStylistId] = useState(lockedStylistId || "");
  const [useNextAvailable, setUseNextAvailable] = useState(!lockedStylistId);
  const [clientName, setClientName] = useState("Walk-in");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [options, setOptions] = useState<NextOpt[]>([]);
  const [waitlist, setWaitlist] = useState<WaitEntry[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [seatingId, setSeatingId] = useState<string | null>(null);
  const [seatPickId, setSeatPickId] = useState("");

  const walkInBase =
    mode === "display"
      ? `/api/display/${slug}/walk-in`
      : mode === "stylist"
        ? "/api/stylist/walk-in"
        : "/api/admin/walk-in";
  const waitlistBase =
    mode === "display"
      ? `/api/display/${slug}/waitlist`
      : mode === "stylist"
        ? "/api/stylist/waitlist"
        : "/api/admin/waitlist";
  const seatMethod = mode === "display" ? "POST" : "PATCH";

  const loadCatalog = useCallback(async () => {
    if (!showForm) return;
    const res = await fetch(walkInBase);
    if (res.status === 401) {
      window.location.href =
        mode === "stylist" ? "/stylist/login" : "/manager/login";
      return;
    }
    if (!res.ok) return;
    const data = await res.json();
    setServices(data.services || []);
    if (mode === "stylist") {
      const id = lockedStylistId || data.stylistId || "";
      setStylists([{ id, name: lockedStylistName || "You" }]);
      setStylistId(id);
      setUseNextAvailable(false);
    } else {
      setStylists(data.stylists || []);
    }
  }, [walkInBase, mode, lockedStylistId, lockedStylistName, showForm]);

  const loadWaitlist = useCallback(async () => {
    if (!includeWaitlist) return;
    const res = await fetch(waitlistBase);
    if (res.status === 401) {
      window.location.href =
        mode === "stylist" ? "/stylist/login" : "/manager/login";
      return;
    }
    if (!res.ok) return;
    const data = await res.json();
    setWaitlist(data.waitlist || []);
  }, [includeWaitlist, waitlistBase, mode]);

  const loadNext = useCallback(async () => {
    if (!showForm || !serviceId) {
      setOptions([]);
      return;
    }
    const q = new URLSearchParams({ serviceId });
    if (mode === "stylist" && (lockedStylistId || stylistId)) {
      q.set("stylistId", lockedStylistId || stylistId);
    } else if (!useNextAvailable && stylistId) {
      q.set("stylistId", stylistId);
    }
    const res = await fetch(`${walkInBase}?${q}`);
    if (!res.ok) {
      setOptions([]);
      return;
    }
    const data = await res.json();
    setOptions(data.options || []);
    if (data.services?.length) setServices(data.services);
  }, [
    showForm,
    serviceId,
    stylistId,
    useNextAvailable,
    walkInBase,
    mode,
    lockedStylistId,
  ]);

  useEffect(() => {
    void loadCatalog();
    void loadWaitlist();
  }, [loadCatalog, loadWaitlist]);

  useEffect(() => {
    void loadNext();
  }, [loadNext]);

  useEffect(() => {
    if (!pollMs || !includeWaitlist) return;
    const id = window.setInterval(() => void loadWaitlist(), pollMs);
    return () => window.clearInterval(id);
  }, [pollMs, includeWaitlist, loadWaitlist]);

  const filteredStylists = useMemo(() => {
    if (!serviceId) return stylists;
    const svc = services.find((s) => s.id === serviceId);
    if (!svc?.stylistIds?.length) return stylists;
    return stylists.filter((s) => svc.stylistIds!.includes(s.id));
  }, [services, stylists, serviceId]);

  const next = options[0] || null;

  function openSeatPicker(w: WaitEntry) {
    setError("");
    setSeatingId(w.id);
    const opts = w.availableOptions || [];
    const defaultId =
      (mode === "stylist" &&
        lockedStylistId &&
        opts.find((o) => o.stylistId === lockedStylistId)?.stylistId) ||
      w.nextAvailable?.stylistId ||
      opts[0]?.stylistId ||
      "";
    setSeatPickId(defaultId);
  }

  async function confirmSeat() {
    if (!seatingId || !seatPickId) return;
    setBusy(true);
    setError("");
    setMessage("");
    const res = await fetch(waitlistBase, {
      method: seatMethod,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "seat",
        id: seatingId,
        stylistId: seatPickId,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not seat guest");
      await loadWaitlist();
      return;
    }
    const stylistName =
      data.appointment?.stylist?.name ||
      data.entry?.stylist?.name ||
      "stylist";
    setMessage(
      `Seated ${data.appointment?.client?.name || "guest"} with ${stylistName} — Check in when they sit, then Done with payment`
    );
    setSeatingId(null);
    setSeatPickId("");
    await loadWaitlist();
    await loadNext();
    onCreated?.();
  }

  async function createWalkIn() {
    setBusy(true);
    setError("");
    setMessage("");
    const body: Record<string, unknown> = {
      serviceId,
      clientName: clientName.trim() || "Walk-in",
      clientPhone,
      notes,
    };
    if (mode !== "stylist") {
      if (!useNextAvailable && stylistId) {
        body.stylistId = stylistId;
        body.nextAvailable = false;
      } else {
        body.nextAvailable = true;
      }
    }

    const res = await fetch(walkInBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not create walk-in");
      return;
    }
    setMessage(
      `Walk-in seated with ${data.appointment.stylist.name}` +
        (data.waitMinutes > 0
          ? ` · starts in ~${data.waitMinutes} min`
          : " · ready now")
    );
    setClientName("Walk-in");
    setClientPhone("");
    setNotes("");
    await loadNext();
    await loadWaitlist();
    onCreated?.();
  }

  async function addToWaitlist() {
    setBusy(true);
    setError("");
    setMessage("");
    const body: Record<string, unknown> = {
      clientName: clientName.trim() || "Walk-in guest",
      clientPhone,
      serviceId: serviceId || null,
      note: notes || null,
    };
    if (mode === "stylist") {
      body.stylistId = lockedStylistId || stylistId || null;
      body.preferSelf = true;
    } else {
      body.stylistId = useNextAvailable ? null : stylistId || null;
    }
    const res = await fetch(waitlistBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not add to waitlist");
      return;
    }
    setMessage(
      `Added to waitlist` +
        (data.entry?.estimatedWaitMin != null
          ? ` · ${formatWait(data.entry.estimatedWaitMin)}`
          : "")
    );
    setClientName("Walk-in");
    setClientPhone("");
    setNotes("");
    await loadWaitlist();
  }

  async function cancelWaitlist(id: string) {
    if (!window.confirm("Remove this guest from the waitlist?")) return;
    setBusy(true);
    const res = await fetch(waitlistBase, {
      method: seatMethod,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", id }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not cancel");
      return;
    }
    if (seatingId === id) {
      setSeatingId(null);
      setSeatPickId("");
    }
    await loadWaitlist();
  }

  const selectedService = services.find((s) => s.id === serviceId);

  return (
    <div className="space-y-6" data-testid="walk-in-panel">
      {showForm ? (
        <form
          className="grid gap-4 rounded-2xl border border-[#c9a87c]/30 bg-[#2a211c] p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void createWalkIn();
          }}
        >
          <label className="grid gap-1 text-sm text-[#d4c4b0]">
            Service
            <select
              required
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              aria-label="Walk-in service"
              className="rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-[#fffaf6]"
            >
              <option value="">Choose service</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.durationMin} min · ${centsToDollars(s.priceCents)}
                </option>
              ))}
            </select>
          </label>

          {mode !== "stylist" ? (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-[#d4c4b0]">
                <input
                  type="checkbox"
                  checked={useNextAvailable}
                  onChange={(e) => setUseNextAvailable(e.target.checked)}
                />
                Next available stylist
              </label>
              {!useNextAvailable ? (
                <label className="grid gap-1 text-sm text-[#d4c4b0]">
                  Stylist
                  <select
                    required={!useNextAvailable}
                    value={stylistId}
                    onChange={(e) => setStylistId(e.target.value)}
                    aria-label="Walk-in stylist"
                    className="rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-[#fffaf6]"
                  >
                    <option value="">Choose stylist</option>
                    {filteredStylists.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted">
              Walk-in for{" "}
              <span className="text-[#f0c987]">{lockedStylistName || "you"}</span>
              {" · "}or seat waitlist guests to any open chair
            </p>
          )}

          {next ? (
            <p
              className="rounded-xl border border-[#9fe3b8]/30 bg-[#1c2a22] px-3 py-2 text-sm text-[#9fe3b8]"
              data-testid="walk-in-eta"
            >
              Next open: {next.stylistName} ·{" "}
              {new Date(next.startsAt).toLocaleTimeString("en-CA", {
                hour: "numeric",
                minute: "2-digit",
              })}{" "}
              · {formatWait(next.waitMinutes)}
              {selectedService ? ` · ${selectedService.durationMin} min service` : ""}
            </p>
          ) : serviceId ? (
            <p className="rounded-xl border border-[#f0c987]/30 bg-[#3a2a22] px-3 py-2 text-sm text-[#f0c987]">
              No open slot right now — add to waitlist for an estimated wait.
            </p>
          ) : null}

          <label className="grid gap-1 text-sm text-[#d4c4b0]">
            Client name
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              aria-label="Walk-in client name"
              className="rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-[#fffaf6]"
            />
          </label>
          <label className="grid gap-1 text-sm text-[#d4c4b0]">
            Phone (optional)
            <input
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              aria-label="Walk-in client phone"
              className="rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-[#fffaf6]"
            />
          </label>
          <label className="grid gap-1 text-sm text-[#d4c4b0]">
            Note (optional)
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-[#fffaf6]"
            />
          </label>

          {error ? <p className="text-sm text-[#f5a8a8]">{error}</p> : null}
          {message ? <p className="text-sm text-[#9fe3b8]">{message}</p> : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={
                busy ||
                !serviceId ||
                (mode !== "stylist" && !useNextAvailable && !stylistId)
              }
              className="btn-solid rounded-full px-5 py-2.5 disabled:opacity-40"
            >
              {busy ? "Saving…" : "Seat walk-in"}
            </button>
            <button
              type="button"
              disabled={busy || !serviceId}
              onClick={() => void addToWaitlist()}
              className="rounded-full border border-[#c9a87c]/45 px-5 py-2.5 text-sm text-[#f0c987] disabled:opacity-40"
            >
              Add to waitlist
            </button>
          </div>
        </form>
      ) : null}

      {includeWaitlist ? (
        <section className="space-y-3" data-testid="walk-in-waitlist">
          <div className="flex items-end justify-between gap-2">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-xl text-[#fffaf6]">
                Waitlist
                {waitlist.length > 0 ? (
                  <span className="ml-2 text-base text-[#f0c987]">({waitlist.length})</span>
                ) : null}
              </h2>
              <p className="text-sm text-muted">
                Seat now → pick stylist → Check in → Done with payment
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadWaitlist()}
              className="text-xs text-[#c9a87c] underline"
            >
              Refresh
            </button>
          </div>
          {error && !showForm ? <p className="text-sm text-[#f5a8a8]">{error}</p> : null}
          {message && !showForm ? <p className="text-sm text-[#9fe3b8]">{message}</p> : null}
          {waitlist.length === 0 ? (
            <p className="text-sm text-muted">No one waiting.</p>
          ) : (
            <ul className="space-y-2">
              {waitlist.map((w) => {
                const opts = w.availableOptions || [];
                const picking = seatingId === w.id;
                return (
                  <li
                    key={w.id}
                    className="rounded-2xl border border-[#c9a87c]/25 bg-[#2a211c] px-4 py-3"
                    data-testid="waitlist-entry"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[#fffaf6]">{w.clientName}</p>
                        <p className="text-sm text-muted">
                          {w.service?.name || "Any service"}
                          {w.stylist
                            ? ` · prefers ${w.stylist.name}`
                            : " · next available"}
                          {w.clientPhone ? ` · ${w.clientPhone}` : ""}
                        </p>
                        <p className="mt-1 text-sm text-[#f0c987]">
                          {formatWait(w.estimatedWaitMin)}
                          {w.nextAvailable
                            ? ` · ${w.nextAvailable.stylistName} at ${new Date(
                                w.nextAvailable.startsAt
                              ).toLocaleTimeString("en-CA", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}`
                            : ""}
                        </p>
                      </div>
                      {!picking ? (
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            disabled={busy || opts.length === 0}
                            onClick={() => openSeatPicker(w)}
                            className="rounded-full bg-[#c9a87c] px-3 py-1.5 text-xs font-semibold text-[#1c1714] disabled:opacity-40"
                            data-testid="waitlist-seat-now"
                          >
                            Seat now
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void cancelWaitlist(w.id)}
                            className="text-xs text-[#f5a8a8] underline"
                          >
                            Remove
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {picking ? (
                      <div
                        className="mt-3 space-y-3 rounded-xl border border-[#c9a87c]/30 bg-[#1c1714] p-3"
                        data-testid="waitlist-seat-picker"
                      >
                        <p className="text-xs font-semibold tracking-wide text-[#c9a87c] uppercase">
                          Assign stylist
                        </p>
                        {opts.length === 0 ? (
                          <p className="text-sm text-[#f5a8a8]">No open chairs right now.</p>
                        ) : (
                          <ul className="space-y-2">
                            {opts.map((o) => {
                              const isSelf =
                                mode === "stylist" && o.stylistId === lockedStylistId;
                              return (
                                <li key={o.stylistId}>
                                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#c9a87c]/20 px-3 py-2 text-sm text-[#fffaf6] has-[:checked]:border-[#f0c987] has-[:checked]:bg-[#3a2a22]/60">
                                    <input
                                      type="radio"
                                      name={`seat-${w.id}`}
                                      value={o.stylistId}
                                      checked={seatPickId === o.stylistId}
                                      onChange={() => setSeatPickId(o.stylistId)}
                                      aria-label={`Seat with ${o.stylistName}`}
                                    />
                                    <span className="flex-1">
                                      {o.stylistName}
                                      {isSelf ? " (you)" : ""}
                                    </span>
                                    <span className="text-[#f0c987]">
                                      {formatWait(o.waitMinutes)} ·{" "}
                                      {new Date(o.startsAt).toLocaleTimeString("en-CA", {
                                        hour: "numeric",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy || !seatPickId}
                            onClick={() => void confirmSeat()}
                            className="rounded-full bg-[#c9a87c] px-4 py-1.5 text-xs font-semibold text-[#1c1714] disabled:opacity-40"
                            data-testid="waitlist-confirm-seat"
                          >
                            {busy ? "Seating…" : "Confirm seat"}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setSeatingId(null);
                              setSeatPickId("");
                            }}
                            className="text-xs text-[#c9a87c] underline"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
