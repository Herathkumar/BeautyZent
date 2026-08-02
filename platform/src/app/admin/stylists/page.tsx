"use client";

import { useEffect, useState } from "react";

type Stylist = {
  id: string;
  name: string;
  bio: string | null;
  color: string;
  active: boolean;
  calendarConnected: boolean;
  connectUrl: string | null;
};

export default function StylistsAdminPage() {
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  async function load() {
    const res = await fetch("/api/admin/stylists");
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    const data = await res.json();
    setStylists(data.stylists || []);
    setGoogleConfigured(Boolean(data.googleConfigured));
  }

  useEffect(() => {
    load();
  }, []);

  async function addStylist(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/stylists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, bio }),
    });
    setName("");
    setBio("");
    await load();
  }

  return (
    <main className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Stylists & calendars</h1>
        <p className="text-muted">
          Connect each stylist&apos;s Google Calendar so bookings appear on their phone. Or use the
          ICS subscribe link in Apple/Google Calendar.
        </p>
      </div>

      {!googleConfigured && (
        <div className="rounded-2xl border border-champagne/40 bg-cream p-4 text-sm text-muted">
          Google OAuth is not configured yet (set <code>GOOGLE_CLIENT_ID</code> /{" "}
          <code>GOOGLE_CLIENT_SECRET</code>). ICS calendar feeds still work for phone sync during
          the pilot.
        </div>
      )}

      <form onSubmit={addStylist} className="grid gap-3 rounded-2xl border border-ink/10 bg-cream p-4 sm:grid-cols-3">
        <input
          required
          placeholder="Stylist name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl border border-ink/15 px-3 py-2"
        />
        <input
          placeholder="Bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="rounded-xl border border-ink/15 px-3 py-2"
        />
        <button type="submit" className="rounded-full bg-ink px-4 py-2 text-cream">
          Add stylist
        </button>
      </form>

      <div className="grid gap-4">
        {stylists.map((s) => (
          <article key={s.id} className="rounded-2xl border border-ink/10 bg-cream p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 font-medium">
                  <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </p>
                {s.bio && <p className="mt-1 text-sm text-muted">{s.bio}</p>}
                <p className="mt-2 text-sm">
                  Calendar:{" "}
                  {s.calendarConnected ? (
                    <span className="text-green-800">Google connected</span>
                  ) : (
                    <span className="text-muted">Not connected via Google</span>
                  )}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {s.connectUrl && (
                  <a
                    href={s.connectUrl}
                    className="rounded-full bg-ink px-4 py-2 text-center text-sm text-cream"
                  >
                    Connect Google Calendar
                  </a>
                )}
                <a
                  href={`/api/calendar/stylist/${s.id}/ics`}
                  className="rounded-full border border-ink/20 px-4 py-2 text-center text-sm"
                >
                  Download / subscribe ICS
                </a>
              </div>
            </div>
            <p className="mt-3 break-all text-xs text-muted">
              Subscribe URL: {appUrl}/api/calendar/stylist/{s.id}/ics
            </p>
          </article>
        ))}
      </div>
    </main>
  );
}
