"use client";

import Link from "next/link";
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
        <p className="text-xs font-semibold tracking-[0.2em] text-[#c9a87c] uppercase">Team</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#fffaf6]">
          Stylists & calendars
        </h1>
        <p className="mt-2 text-[#d4c4b0]">
          Connect each stylist&apos;s Google Calendar so bookings appear on their phone. Or use the
          ICS subscribe link in Apple/Google Calendar.
        </p>
      </div>

      {!googleConfigured && (
        <div className="rounded-2xl border border-[#c9a87c]/40 bg-[#2a211c] p-4 text-sm text-[#d4c4b0]">
          Google OAuth is not configured yet (set <code className="text-[#f0c987]">GOOGLE_CLIENT_ID</code> /{" "}
          <code className="text-[#f0c987]">GOOGLE_CLIENT_SECRET</code>). ICS calendar feeds still work
          for phone sync during the pilot.
        </div>
      )}

      <form
        onSubmit={addStylist}
        className="grid gap-3 rounded-2xl border border-[#c9a87c]/30 bg-[#2a211c] p-4 sm:grid-cols-3"
      >
        <input
          required
          placeholder="Stylist name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-[#fffaf6]"
        />
        <input
          placeholder="Bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-[#fffaf6]"
        />
        <button type="submit" className="btn-solid rounded-full px-4 py-2">
          Add stylist
        </button>
      </form>

      <div className="grid gap-4">
        {stylists.map((s) => (
          <article
            key={s.id}
            className="rounded-2xl border border-[#c9a87c]/30 bg-[#2a211c] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2.5 text-xl font-bold text-[#fffaf6]">
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-[#f0c987]/40"
                    style={{ background: s.color }}
                  />
                  {s.name}
                </p>
                {s.bio && <p className="mt-2 text-base text-[#d4c4b0]">{s.bio}</p>}
                <p className="mt-3 text-sm text-[#d4c4b0]">
                  Calendar:{" "}
                  {s.calendarConnected ? (
                    <span className="font-semibold text-[#9fe3b8]">Google connected</span>
                  ) : (
                    <span className="text-[#f0c987]">Not connected via Google</span>
                  )}
                </p>
                <p className="mt-3 break-all text-xs text-[#a89a8c]">
                  Subscribe URL: {appUrl}/api/calendar/stylist/{s.id}/ics
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Link
                  href={`/admin/stylists/${s.id}/schedule`}
                  className="btn-solid rounded-full px-4 py-2 text-center text-sm"
                >
                  Manage schedule
                </Link>
                {s.connectUrl && (
                  <a
                    href={s.connectUrl}
                    className="rounded-full border border-[#c9a87c]/50 px-4 py-2 text-center text-sm text-[#f0c987]"
                  >
                    Connect Google Calendar
                  </a>
                )}
                <a
                  href={`/api/calendar/stylist/${s.id}/ics`}
                  className="rounded-full border border-[#c9a87c]/50 px-4 py-2 text-center text-sm text-[#f0c987]"
                >
                  Download / subscribe ICS
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
