"use client";

import { useCallback, useEffect, useState } from "react";

type Appt = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  client: { name: string; phone: string | null };
  service: { name: string };
  stylist: { name: string; color: string };
};

export function DisplayBoard({ slug }: { slug: string }) {
  const [appointments, setAppointments] = useState<Appt[]>([]);
  const [salonName, setSalonName] = useState("");
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(() => {
    fetch(`/api/display/${slug}/today`)
      .then((r) => r.json())
      .then((data) => {
        setAppointments(data.appointments || []);
        setSalonName(data.salon?.name || "");
      })
      .catch(() => undefined);
  }, [slug]);

  useEffect(() => {
    load();
    const poll = setInterval(load, 15000);
    const clock = setInterval(() => setNow(new Date()), 30000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [load]);

  async function setStatus(id: string, status: string) {
    await fetch(`/api/display/${slug}/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  return (
    <div className="min-h-screen bg-[#1c1714] px-6 py-6 text-[#fffaf6]">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-xs tracking-[0.2em] text-[#c9a87c] uppercase">Salon floor</p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl">{salonName || "Today"}</h1>
        </div>
        <p className="text-xl text-white/70">
          {now.toLocaleString("en-CA", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </header>

      <div className="grid gap-3">
        {appointments.length === 0 && (
          <p className="rounded-2xl border border-white/10 p-8 text-white/60">
            No bookings for today yet.
          </p>
        )}
        {appointments.map((a) => (
          <article
            key={a.id}
            className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-[140px_1fr_auto] md:items-center"
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
              <p className="text-white/70">
                {a.service.name} ·{" "}
                <span style={{ color: a.stylist.color }}>{a.stylist.name}</span>
              </p>
              <p className="mt-1 text-xs tracking-wide text-[#c9a87c] uppercase">{a.status}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {a.status === "BOOKED" && (
                <button
                  type="button"
                  onClick={() => setStatus(a.id, "CHECKED_IN")}
                  className="rounded-full bg-[#c9a87c] px-3 py-2 text-sm font-medium text-[#1c1714]"
                >
                  Check in
                </button>
              )}
              {["BOOKED", "CHECKED_IN"].includes(a.status) && (
                <button
                  type="button"
                  onClick={() => setStatus(a.id, "COMPLETED")}
                  className="rounded-full border border-white/30 px-3 py-2 text-sm"
                >
                  Done
                </button>
              )}
              {a.status !== "CANCELLED" && a.status !== "COMPLETED" && (
                <button
                  type="button"
                  onClick={() => setStatus(a.id, "CANCELLED")}
                  className="rounded-full border border-red-300/40 px-3 py-2 text-sm text-red-200"
                >
                  Cancel
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
