"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Stylist = {
  id: string;
  name: string;
  bio: string | null;
  color: string;
  gender?: string;
  photoUrl?: string;
  hasPhoto?: boolean;
  active: boolean;
  selfManageSchedule?: boolean;
  payType?: string;
  hourlyRateCents?: number | null;
  commissionBps?: number | null;
  loginEmail: string | null;
  userId: string | null;
  userRole?: string | null;
  calendarConnected: boolean;
  connectUrl: string | null;
};

type IssuedCredentials = {
  email: string;
  temporaryPassword: string;
  stylistName: string;
  stylistId: string | null;
  reason: "created" | "reset";
};

function CredentialsPanel({
  issued,
  copied,
  appUrl,
  onCopy,
  onDone,
  panelRef,
}: {
  issued: IssuedCredentials;
  copied: boolean;
  appUrl: string;
  onCopy: (text: string) => void;
  onDone: () => void;
  panelRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={panelRef}
      className="mt-4 rounded-xl border border-[#9fe3b8]/45 bg-[#1a2a22] p-4 text-[#fffaf6]"
      role="status"
      aria-live="polite"
      data-testid="issued-credentials"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[#9fe3b8]">
        {issued.reason === "reset"
          ? `New password for ${issued.stylistName}`
          : `Share with ${issued.stylistName} — shown once`}
      </p>
      <p className="mt-2 text-sm text-[#d4c4b0]">
        Copy these now. They disappear when you press Done.
      </p>
      <p className="mt-3 text-sm text-[#d4c4b0]">Login (username)</p>
      <p className="break-all font-mono text-lg text-[#f0c987]" data-testid="issued-email">
        {issued.email}
      </p>
      <p className="mt-3 text-sm text-[#d4c4b0]">Temporary password</p>
      <p
        className="select-all break-all font-mono text-2xl font-semibold tracking-wide text-[#f0c987]"
        data-testid="issued-password"
      >
        {issued.temporaryPassword}
      </p>
      {copied ? <p className="mt-2 text-sm text-[#9fe3b8]">Copied to clipboard</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-solid rounded-full px-4 py-2 text-sm"
          onClick={() => onCopy(`${issued.email}\n${issued.temporaryPassword}`)}
        >
          Copy login + password
        </button>
        <button
          type="button"
          className="rounded-full border border-[#c9a87c]/50 px-4 py-2 text-sm text-[#f0c987]"
          onClick={() => onCopy(issued.temporaryPassword)}
        >
          Copy password only
        </button>
        <button
          type="button"
          className="rounded-full border border-[#c9a87c]/50 px-4 py-2 text-sm text-[#f0c987]"
          onClick={onDone}
        >
          Done
        </button>
      </div>
      <p className="mt-3 text-xs text-[#a89a8c]">
        Portal: {appUrl}/stylist/login — ask them to change the password under Account after login.
      </p>
    </div>
  );
}

export default function StylistsAdminPage() {
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [emailDomain, setEmailDomain] = useState("fhsalon.ca");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("FEMALE");
  const [selfManageSchedule, setSelfManageSchedule] = useState(false);
  const [payType, setPayType] = useState("COMMISSION");
  const [commissionPct, setCommissionPct] = useState("50");
  const [hourlyRate, setHourlyRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [issued, setIssued] = useState<IssuedCredentials | null>(null);
  const [copied, setCopied] = useState(false);
  const issuedRef = useRef<HTMLDivElement>(null);
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  async function load() {
    const res = await fetch("/api/admin/stylists");
    if (res.status === 401) {
      window.location.href = "/manager/login";
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

  useEffect(() => {
    if (!issued) return;
    issuedRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    void copyText(`${issued.email}\n${issued.temporaryPassword}`);
  }, [issued]);

  async function addStylist(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setCopied(false);
    const res = await fetch("/api/admin/stylists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        bio,
        gender,
        selfManageSchedule,
        payType,
        commissionBps: Math.round(Number(commissionPct || 0) * 100),
        hourlyRateCents: hourlyRate ? Math.round(Number(hourlyRate) * 100) : null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not create stylist");
      return;
    }
    const createdName = name;
    setName("");
    setBio("");
    setGender("FEMALE");
    setSelfManageSchedule(false);
    setPayType("COMMISSION");
    setCommissionPct("50");
    setHourlyRate("");
    if (data.credentials) {
      setIssued({
        email: data.credentials.email,
        temporaryPassword: data.credentials.temporaryPassword,
        stylistName: data.stylist?.name || createdName,
        stylistId: data.stylist?.id || null,
        reason: "created",
      });
    }
    await load();
  }

  async function resetPassword(stylistId: string, stylistName: string) {
    if (!window.confirm(`Generate a new temporary password for ${stylistName}?`)) return;
    setError("");
    setCopied(false);
    setResettingId(stylistId);
    const res = await fetch("/api/admin/stylists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resetPassword", stylistId }),
    });
    const data = await res.json();
    setResettingId(null);
    if (!res.ok) {
      setError(data.error || "Reset failed");
      return;
    }
    if (!data.temporaryPassword || !data.loginEmail) {
      setError("Reset succeeded but password was not returned. Try again.");
      return;
    }
    setIssued({
      email: data.loginEmail,
      temporaryPassword: data.temporaryPassword,
      stylistName,
      stylistId,
      reason: "reset",
    });
  }

  async function toggleSelfManage(stylist: Stylist, next: boolean) {
    setError("");
    setStylists((prev) =>
      prev.map((s) => (s.id === stylist.id ? { ...s, selfManageSchedule: next } : s))
    );
    const res = await fetch("/api/admin/stylists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateSelfManage",
        stylistId: stylist.id,
        selfManageSchedule: next,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStylists((prev) =>
        prev.map((s) =>
          s.id === stylist.id ? { ...s, selfManageSchedule: !next } : s
        )
      );
      setError(data.error || "Could not update self-manage setting");
    }
  }

  async function setStylistActive(stylist: Stylist, active: boolean) {
    if (
      !active &&
      !window.confirm(
        `Disable ${stylist.name}?\n\nThey won't appear for online booking or on the floor until you enable them again.`
      )
    ) {
      return;
    }
    setError("");
    const res = await fetch("/api/admin/stylists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setActive", stylistId: stylist.id, active }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not update stylist");
      return;
    }
    await load();
  }

  async function removeStylist(stylist: Stylist) {
    const loginNote = stylist.loginEmail
      ? stylist.userRole === "STYLIST"
        ? `\nTheir login (${stylist.loginEmail}) will be deleted.`
        : `\nManager login stays; stylist link is removed.`
      : "";
    if (
      !window.confirm(
        `Remove ${stylist.name} from the salon?${loginNote}\n\nThey leave booking and the floor. Past appointments are kept.`
      )
    ) {
      return;
    }
    setError("");
    const res = await fetch("/api/admin/stylists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", stylistId: stylist.id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not remove stylist");
      return;
    }
    if (issued?.stylistId === stylist.id) clearIssued();
    await load();
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      return true;
    } catch {
      setCopied(false);
      return false;
    }
  }

  function clearIssued() {
    setIssued(null);
    setCopied(false);
  }

  const createPanel =
    issued && (issued.reason === "created" || !issued.stylistId) ? issued : null;

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

      {error ? <p className="text-sm text-[#f5a8a8]">{error}</p> : null}

      {!googleConfigured && (
        <div className="rounded-2xl border border-[#c9a87c]/40 bg-[#2a211c] p-4 text-sm text-[#d4c4b0]">
          Google OAuth is not configured yet. ICS calendar feeds still work for phone sync.
        </div>
      )}

      <div className="rounded-2xl border border-[#c9a87c]/30 bg-[#2a211c] p-4">
        <form onSubmit={addStylist} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          <select
            value={payType}
            onChange={(e) => setPayType(e.target.value)}
            aria-label="Pay type"
            className="rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-[#fffaf6]"
          >
            <option value="COMMISSION">Commission</option>
            <option value="HOURLY">Hourly</option>
            <option value="BOTH">Hourly + commission</option>
          </select>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            placeholder="Commission %"
            value={commissionPct}
            onChange={(e) => setCommissionPct(e.target.value)}
            className="rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-[#fffaf6]"
          />
          <input
            type="number"
            min={0}
            step={0.5}
            placeholder="Hourly rate $"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            className="rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-[#fffaf6]"
          />
          <label className="flex items-center gap-2 text-sm text-[#d4c4b0]">
            <input
              type="checkbox"
              checked={selfManageSchedule}
              onChange={(e) => setSelfManageSchedule(e.target.checked)}
            />
            Self-manage schedule (no leave approval)
          </label>
          <button type="submit" disabled={saving} className="btn-solid rounded-full px-4 py-2">
            {saving ? "Creating…" : "Add stylist + login"}
          </button>
        </form>
        {createPanel ? (
          <CredentialsPanel
            issued={createPanel}
            copied={copied}
            appUrl={appUrl}
            onCopy={copyText}
            onDone={clearIssued}
            panelRef={issuedRef}
          />
        ) : null}
      </div>

      <div className="grid gap-4">
        {stylists.map((s) => {
          const panelHere =
            issued && issued.reason === "reset" && issued.stylistId === s.id ? issued : null;
          return (
            <article
              key={s.id}
              className={`rounded-2xl border bg-[#2a211c] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.25)] ${
                s.active
                  ? "border-[#c9a87c]/30"
                  : "border-[#c9a87c]/15 opacity-75"
              }`}
              data-testid="stylist-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-3 text-xl font-bold text-[#fffaf6]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.photoUrl || "/avatars/stylist-neutral.svg"}
                      alt=""
                      width={44}
                      height={44}
                      className="h-11 w-11 rounded-full object-cover ring-2 ring-[#f0c987]/35"
                    />
                    <span className="flex flex-wrap items-center gap-2">
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-[#f0c987]/40"
                        style={{ background: s.color }}
                      />
                      {s.name}
                      {!s.active ? (
                        <span className="rounded-full border border-[#f5a8a8]/45 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[#f5a8a8]">
                          Disabled
                        </span>
                      ) : null}
                    </span>
                  </p>
                  {s.bio && <p className="mt-2 text-base text-[#d4c4b0]">{s.bio}</p>}
                  <p className="mt-3 text-sm text-[#d4c4b0]">
                    Pay:{" "}
                    <span className="font-semibold text-[#f0c987]">
                      {s.payType || "COMMISSION"}
                      {s.commissionBps != null ? ` · ${(s.commissionBps / 100).toFixed(0)}%` : ""}
                      {s.hourlyRateCents != null
                        ? ` · $${(s.hourlyRateCents / 100).toFixed(2)}/hr`
                        : ""}
                    </span>
                    {s.selfManageSchedule ? (
                      <span className="text-[#9fe3b8]"> · Self-manage</span>
                    ) : (
                      <span className="text-[#a89a8c]"> · Needs leave approval</span>
                    )}
                  </p>
                  <label className="mt-3 flex items-center gap-2 text-sm text-[#d4c4b0]">
                    <input
                      type="checkbox"
                      checked={Boolean(s.selfManageSchedule)}
                      onChange={(e) => void toggleSelfManage(s, e.target.checked)}
                    />
                    Self-manage schedule (no leave approval)
                  </label>
                  <p className="mt-2 text-sm text-[#d4c4b0]">
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
                    href={`/manager/stylists/${s.id}/schedule`}
                    className="btn-solid rounded-full px-4 py-2 text-center text-sm"
                  >
                    Manage schedule
                  </Link>
                  {s.loginEmail ? (
                    <button
                      type="button"
                      disabled={resettingId === s.id || !s.active}
                      onClick={() => resetPassword(s.id, s.name)}
                      className="rounded-full border border-[#c9a87c]/50 px-4 py-2 text-sm text-[#f0c987] disabled:opacity-40"
                    >
                      {resettingId === s.id ? "Resetting…" : "Reset password"}
                    </button>
                  ) : null}
                  {s.connectUrl && s.active ? (
                    <a
                      href={s.connectUrl}
                      className="rounded-full border border-[#c9a87c]/50 px-4 py-2 text-center text-sm text-[#f0c987]"
                    >
                      Connect Google Calendar
                    </a>
                  ) : null}
                  {s.active ? (
                    <button
                      type="button"
                      onClick={() => void setStylistActive(s, false)}
                      className="rounded-full border border-[#c9a87c]/50 px-4 py-2 text-sm text-[#f0c987]"
                      data-testid="stylist-disable"
                    >
                      Disable
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void setStylistActive(s, true)}
                      className="rounded-full border border-[#9fe3b8]/50 px-4 py-2 text-sm text-[#9fe3b8]"
                      data-testid="stylist-enable"
                    >
                      Enable
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void removeStylist(s)}
                    className="rounded-full border border-[rgba(245,168,168,0.45)] px-4 py-2 text-sm text-[#f5a8a8]"
                    data-testid="stylist-remove"
                  >
                    Remove
                  </button>
                </div>
              </div>
              {panelHere ? (
                <CredentialsPanel
                  issued={panelHere}
                  copied={copied}
                  appUrl={appUrl}
                  onCopy={copyText}
                  onDone={clearIssued}
                  panelRef={issuedRef}
                />
              ) : null}
            </article>
          );
        })}
      </div>
    </main>
  );
}
