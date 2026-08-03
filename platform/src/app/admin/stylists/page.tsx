"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Stylist = {
  id: string;
  name: string;
  bio: string | null;
  color: string;
  gender: string;
  photoUrl: string;
  hasPhoto: boolean;
  active: boolean;
  loginEmail: string | null;
  userId: string | null;
  calendarConnected: boolean;
  connectUrl: string | null;
};

type IssuedCredentials = {
  email: string;
  temporaryPassword: string;
  stylistName: string;
};

export default function StylistsAdminPage() {
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [emailDomain, setEmailDomain] = useState("fhsalon.ca");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("FEMALE");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [issued, setIssued] = useState<IssuedCredentials | null>(null);
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
    if (data.emailDomain) setEmailDomain(data.emailDomain);
  }

  useEffect(() => {
    load();
  }, []);

  async function addStylist(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/stylists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, bio, gender }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not create stylist");
      return;
    }
    setName("");
    setBio("");
    setGender("FEMALE");
    if (data.credentials) {
      setIssued({
        email: data.credentials.email,
        temporaryPassword: data.credentials.temporaryPassword,
        stylistName: data.stylist?.name || name,
      });
    }
    await load();
  }

  async function resetPassword(stylistId: string, stylistName: string) {
    if (!window.confirm(`Generate a new temporary password for ${stylistName}?`)) return;
    const res = await fetch("/api/admin/stylists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resetPassword", stylistId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Reset failed");
      return;
    }
    setIssued({
      email: data.loginEmail,
      temporaryPassword: data.temporaryPassword,
      stylistName,
    });
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }

  return (
    <main className="space-y-8">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-[#c9a87c] uppercase">Team</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#fffaf6]">
          Stylists & logins
        </h1>
        <p className="mt-2 text-[#d4c4b0]">
          New stylists get a login like <code className="text-[#f0c987]">name@{emailDomain}</code> and a
          temporary password. They can change it on their phone under Account.
        </p>
      </div>

      {issued ? (
        <div
          className="rounded-2xl border border-[#9fe3b8]/40 bg-[#1a2a22] p-5 text-[#fffaf6]"
          role="status"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-[#9fe3b8]">
            Share with {issued.stylistName} — shown once
          </p>
          <p className="mt-3 text-sm text-[#d4c4b0]">Login (username)</p>
          <p className="font-mono text-lg text-[#f0c987]">{issued.email}</p>
          <p className="mt-3 text-sm text-[#d4c4b0]">Temporary password</p>
          <p className="font-mono text-lg text-[#f0c987]">{issued.temporaryPassword}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-solid rounded-full px-4 py-2 text-sm"
              onClick={() =>
                copyText(`${issued.email}\n${issued.temporaryPassword}`)
              }
            >
              Copy login + password
            </button>
            <button
              type="button"
              className="rounded-full border border-[#c9a87c]/50 px-4 py-2 text-sm text-[#f0c987]"
              onClick={() => setIssued(null)}
            >
              Done
            </button>
          </div>
          <p className="mt-3 text-xs text-[#a89a8c]">
            Portal: {appUrl}/stylist/login — ask them to change the password after first login.
          </p>
        </div>
      ) : null}

      {error ? <p className="text-sm text-[#f5a8a8]">{error}</p> : null}

      {!googleConfigured && (
        <div className="rounded-2xl border border-[#c9a87c]/40 bg-[#2a211c] p-4 text-sm text-[#d4c4b0]">
          Google OAuth is not configured yet. ICS calendar feeds still work for phone sync.
        </div>
      )}

      <form
        onSubmit={addStylist}
        className="grid gap-3 rounded-2xl border border-[#c9a87c]/30 bg-[#2a211c] p-4 sm:grid-cols-4"
      >
        <input
          required
          placeholder="Stylist name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-[#fffaf6]"
        />
        <input
          placeholder="Bio (optional)"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-[#fffaf6]"
        />
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          aria-label="Gender for avatar"
          className="rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-[#fffaf6]"
        >
          <option value="FEMALE">Female (avatar)</option>
          <option value="MALE">Male (avatar)</option>
          <option value="UNSPECIFIED">Neutral avatar</option>
        </select>
        <button type="submit" disabled={saving} className="btn-solid rounded-full px-4 py-2">
          {saving ? "Creating…" : "Add stylist + login"}
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
                <p className="flex items-center gap-3 text-xl font-bold text-[#fffaf6]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.photoUrl}
                    alt=""
                    width={44}
                    height={44}
                    className="h-11 w-11 rounded-full object-cover ring-2 ring-[#f0c987]/35"
                  />
                  <span className="flex items-center gap-2">
                    <span
                      className="h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-[#f0c987]/40"
                      style={{ background: s.color }}
                    />
                    {s.name}
                  </span>
                </p>
                {s.bio && <p className="mt-2 text-base text-[#d4c4b0]">{s.bio}</p>}
                <p className="mt-3 text-sm text-[#d4c4b0]">
                  Login:{" "}
                  {s.loginEmail ? (
                    <span className="font-semibold text-[#f0c987]">{s.loginEmail}</span>
                  ) : (
                    <span className="text-[#f5a8a8]">No login yet</span>
                  )}
                </p>
                <p className="mt-2 text-sm text-[#d4c4b0]">
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
                {s.loginEmail ? (
                  <button
                    type="button"
                    onClick={() => resetPassword(s.id, s.name)}
                    className="rounded-full border border-[#c9a87c]/50 px-4 py-2 text-sm text-[#f0c987]"
                  >
                    Reset password
                  </button>
                ) : null}
                {s.connectUrl && (
                  <a
                    href={s.connectUrl}
                    className="rounded-full border border-[#c9a87c]/50 px-4 py-2 text-center text-sm text-[#f0c987]"
                  >
                    Connect Google Calendar
                  </a>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
