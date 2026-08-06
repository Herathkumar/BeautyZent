"use client";

import { useEffect, useState } from "react";
import { CLIENT_CANCEL_HOURS } from "@/lib/client-booking";
import { formatCad } from "@/lib/money";

type Row = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  canCancel: boolean;
  service: { name: string; durationMin: number; priceCents: number };
  stylist: { id: string; name: string };
};

export function BookingMyBookings({
  slug,
  open,
  onClose,
  timezone,
}: {
  slug: string;
  open: boolean;
  onClose: () => void;
  timezone?: string;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    fetch(`/api/public/${slug}/my-bookings`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Could not load bookings");
        setRows(d.appointments || []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load"))
      .finally(() => setLoading(false));
  }, [open, slug]);

  async function cancel(id: string) {
    if (!window.confirm("Cancel this booking?")) return;
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/public/${slug}/my-bookings/${id}/cancel`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cancel failed");
      setRows((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: "CANCELLED", canCancel: false } : r
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setBusyId(null);
    }
  }

  if (!open) return null;

  const upcoming = rows.filter(
    (r) =>
      ["BOOKED", "CHECKED_IN"].includes(r.status) &&
      new Date(r.startsAt).getTime() >= Date.now() - 60_000
  );
  const past = rows.filter((r) => !upcoming.includes(r));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3 sm:items-center">
      <div
        className="book-card max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-3xl p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
        role="dialog"
        aria-label="My bookings"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-champagne uppercase">
              Member
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl">
              My bookings
            </h2>
            <p className="mt-1 text-xs text-muted">
              Free cancel online until {CLIENT_CANCEL_HOURS}h before your visit.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-muted"
          >
            Close
          </button>
        </div>

        {loading ? <p className="mt-6 text-sm text-muted">Loading…</p> : null}
        {error ? <p className="mt-4 text-sm text-[#f5a8a8]">{error}</p> : null}

        <section className="mt-5 space-y-3">
          <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
            Upcoming
          </h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted">No upcoming visits.</p>
          ) : (
            upcoming.map((r) => (
              <div key={r.id} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="font-semibold text-white">{r.service.name}</p>
                <p className="mt-1 text-sm text-[#f2c4b0]">
                  {new Date(r.startsAt).toLocaleString("en-CA", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: timezone,
                  })}{" "}
                  · {r.stylist.name}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {formatCad(r.service.priceCents)} · {r.status}
                </p>
                {r.canCancel ? (
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => cancel(r.id)}
                    className="mt-3 rounded-full border border-[rgba(245,168,168,0.45)] px-3 py-1.5 text-xs font-semibold text-[#f5a8a8]"
                  >
                    {busyId === r.id ? "Cancelling…" : "Cancel booking"}
                  </button>
                ) : null}
              </div>
            ))
          )}
        </section>

        {past.length > 0 ? (
          <section className="mt-6 space-y-3">
            <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
              Past
            </h3>
            {past.slice(0, 8).map((r) => (
              <div key={r.id} className="rounded-2xl border border-white/8 px-4 py-3 opacity-80">
                <p className="text-sm font-semibold">{r.service.name}</p>
                <p className="text-xs text-muted">
                  {new Date(r.startsAt).toLocaleDateString("en-CA", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    timeZone: timezone,
                  })}{" "}
                  · {r.stylist.name} · {r.status}
                </p>
              </div>
            ))}
          </section>
        ) : null}
      </div>
    </div>
  );
}
