"use client";

import { useEffect, useState } from "react";
import { BookThemePicker } from "./BookThemePicker";

export type BookClient = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  preferredStylistId: string | null;
};

type Mode = "closed" | "signin" | "join" | "code";

export function ClientMemberBar({
  slug,
  client,
  onClientChange,
  onOpenBookings,
  openSignInSignal = 0,
}: {
  slug: string;
  client: BookClient | null;
  onClientChange: (c: BookClient | null) => void;
  onOpenBookings: () => void;
  /** Bump to pop the sign-in form open from the app tab bar. */
  openSignInSignal?: number;
}) {
  const [mode, setMode] = useState<Mode>("closed");
  const [purpose, setPurpose] = useState<"signin" | "join">("signin");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [themeOpen, setThemeOpen] = useState(false);
  const [themeWelcome, setThemeWelcome] = useState(false);

  useEffect(() => {
    fetch(`/api/public/${slug}/auth/me`)
      .then((r) => r.json())
      .then((d) => onClientChange(d.client || null))
      .catch(() => onClientChange(null));
  }, [slug, onClientChange]);

  useEffect(() => {
    if (!openSignInSignal) return;
    setMode("signin");
    setPurpose("signin");
    setError("");
    setMsg("");
  }, [openSignInSignal]);

  async function requestCode(nextPurpose: "signin" | "join") {
    setBusy(true);
    setError("");
    setMsg("");
    setDemoCode("");
    try {
      const res = await fetch(`/api/public/${slug}/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          purpose: nextPurpose,
          ...(nextPurpose === "join" ? { name, phone } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send code");
      setPurpose(nextPurpose);
      setMode("code");
      setMsg(data.message || "Check your email.");
      if (data.demoCode) setDemoCode(data.demoCode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/public/${slug}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not verify");
      onClientChange(data.client);
      setMode("closed");
      setCode("");
      setMsg(
        purpose === "join"
          ? "Welcome — pick how booking should look."
          : "Welcome back — your details are ready."
      );
      if (purpose === "join") {
        setThemeWelcome(true);
        setThemeOpen(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not verify");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch(`/api/public/${slug}/auth/logout`, { method: "POST" });
    onClientChange(null);
    setMode("closed");
    setPurpose("signin");
    setName("");
    setPhone("");
    setEmail("");
    setCode("");
    setDemoCode("");
    setMsg("");
    setError("");
    setThemeOpen(false);
    setThemeWelcome(false);
  }

  if (client) {
    return (
      <>
        <div className="book-card mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.16em] text-champagne uppercase">
              Member
            </p>
            <p className="truncate font-semibold text-ink">{client.name}</p>
            <p className="truncate text-xs text-muted">{client.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenBookings}
              className="rounded-full border border-[rgba(232,180,162,0.4)] px-3 py-2 text-xs font-semibold text-champagne"
            >
              My bookings
            </button>
            <button
              type="button"
              onClick={() => {
                setThemeWelcome(false);
                setThemeOpen(true);
              }}
              className="rounded-full border border-[rgba(232,180,162,0.4)] px-3 py-2 text-xs font-semibold text-champagne"
            >
              Appearance
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-muted"
            >
              Sign out
            </button>
          </div>
        </div>
        <BookThemePicker
          open={themeOpen}
          title={
            themeWelcome
              ? "Booking is now available in light & dark mode!"
              : "Choose your booking look"
          }
          subtitle={
            themeWelcome
              ? "You can change this now or anytime in Appearance."
              : "Light, dark, or match your device."
          }
          confirmLabel={themeWelcome ? "Got it" : "Save"}
          onClose={() => setThemeOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="book-card mb-5 rounded-2xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-champagne uppercase">
            Faster next time
          </p>
          <p className="mt-1 text-sm text-muted">
            Join with email — no password. Or continue as guest below.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full border border-[rgba(232,180,162,0.4)] px-3 py-2 text-xs font-semibold text-champagne"
            onClick={() => {
              setThemeWelcome(false);
              setThemeOpen(true);
            }}
          >
            Appearance
          </button>
          <button
            type="button"
            className="rounded-full border border-[rgba(232,180,162,0.4)] px-3 py-2 text-xs font-semibold text-[#f2c4b0]"
            onClick={() => {
              setMode("signin");
              setPurpose("signin");
              setError("");
              setMsg("");
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className="btn-solid rounded-full px-3 py-2 text-xs font-semibold"
            onClick={() => {
              setMode("join");
              setPurpose("join");
              setError("");
              setMsg("");
            }}
          >
            Join free
          </button>
        </div>
      </div>

      {mode === "signin" || mode === "join" ? (
        <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
          <p className="text-sm text-muted sm:col-span-2">
            {mode === "join"
              ? "Join to save your details and keep a photo look book of every visit."
              : "Sign in to see your visits and your look book."}
          </p>
          {mode === "join" ? (
            <>
              <label className="grid gap-1 text-xs text-muted">
                Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl border px-3 py-2.5 text-sm text-white"
                  autoComplete="name"
                />
              </label>
              <label className="grid gap-1 text-xs text-muted">
                Phone
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="rounded-xl border px-3 py-2.5 text-sm text-white"
                  autoComplete="tel"
                  inputMode="tel"
                />
              </label>
            </>
          ) : null}
          <label className={`grid gap-1 text-xs text-muted ${mode === "signin" ? "sm:col-span-2" : "sm:col-span-2"}`}>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border px-3 py-2.5 text-sm text-white"
              autoComplete="email"
              placeholder="you@email.com"
            />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => requestCode(mode === "join" ? "join" : "signin")}
              className="btn-solid rounded-full px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              {busy ? "Sending…" : "Email me a code"}
            </button>
            <button
              type="button"
              onClick={() => setMode("closed")}
              className="rounded-full border border-white/15 px-4 py-2.5 text-sm text-muted"
            >
              Not now
            </button>
          </div>
        </div>
      ) : null}

      {mode === "code" ? (
        <div className="mt-4 grid gap-3 border-t border-white/10 pt-4">
          <p className="text-sm text-muted">{msg}</p>
          {demoCode ? (
            <p className="rounded-xl border border-[rgba(232,180,162,0.35)] bg-[rgba(232,180,162,0.1)] px-3 py-2 text-sm text-[#f2c4b0]">
              Demo code: <span className="font-bold tracking-widest">{demoCode}</span>
            </p>
          ) : null}
          <label className="grid gap-1 text-xs text-muted">
            6-digit code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="rounded-xl border px-3 py-2.5 text-sm tracking-[0.35em] text-white"
              inputMode="numeric"
              autoComplete="one-time-code"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || code.length !== 6}
              onClick={verify}
              className="btn-solid rounded-full px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              {busy ? "Checking…" : purpose === "join" ? "Join & continue" : "Sign in"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => requestCode(purpose)}
              className="rounded-full border border-white/15 px-4 py-2.5 text-sm text-muted"
            >
              Resend
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-[#f5a8a8]">{error}</p> : null}
      {msg && mode === "closed" ? <p className="mt-3 text-sm text-champagne">{msg}</p> : null}

      <BookThemePicker
        open={themeOpen}
        title={
          themeWelcome
            ? "Booking is now available in light & dark mode!"
            : "Choose your booking look"
        }
        subtitle={
          themeWelcome
            ? "You can change this now or anytime in Appearance."
            : "Saved on this device — no account needed."
        }
        confirmLabel={themeWelcome ? "Got it" : "Save"}
        onClose={() => setThemeOpen(false)}
      />
    </div>
  );
}
