"use client";

import { useEffect, useState } from "react";
import {
  BookingSalonChooser,
  type SalonMembershipOption,
} from "./BookingSalonChooser";

export type BookClient = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  preferredStylistId: string | null;
};

type Mode = "closed" | "signin" | "join" | "code" | "choose";

export function ClientMemberBar({
  slug,
  client,
  onClientChange,
  onOpenBookings: _onOpenBookings,
  onOpenProfile,
  openSignInSignal = 0,
  openSignInMode = "signin",
}: {
  slug: string;
  client: BookClient | null;
  onClientChange: (c: BookClient | null) => void;
  onOpenBookings: () => void;
  onOpenProfile: () => void;
  /** Bump to pop the sign-in / join form open from the app tab bar. */
  openSignInSignal?: number;
  openSignInMode?: "signin" | "join";
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
  const [pendingSalons, setPendingSalons] = useState<SalonMembershipOption[] | null>(
    null
  );
  const [pendingCurrentSalonId, setPendingCurrentSalonId] = useState<string | null>(
    null
  );

  useEffect(() => {
    fetch(`/api/public/${slug}/auth/me`)
      .then((r) => r.json())
      .then((d) => onClientChange(d.client || null))
      .catch(() => onClientChange(null));
  }, [slug, onClientChange]);

  useEffect(() => {
    if (!openSignInSignal) return;
    setMode(openSignInMode);
    setPurpose(openSignInMode);
    setError("");
    setMsg("");
  }, [openSignInSignal, openSignInMode]);

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
      setCode("");
      const salons = Array.isArray(data.salons)
        ? (data.salons as SalonMembershipOption[])
        : [];
      if (salons.length > 1) {
        setPendingSalons(salons);
        setPendingCurrentSalonId(data.currentSalonId || null);
        setMode("choose");
        setMsg("You're signed in — pick a business to continue.");
      } else {
        setMode("closed");
        setPendingSalons(null);
        setPendingCurrentSalonId(null);
        setMsg(
          purpose === "join"
            ? "Welcome — finish setting up your profile."
            : "Welcome back — your details are ready."
        );
        if (purpose === "join") onOpenProfile();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not verify");
    } finally {
      setBusy(false);
    }
  }

  if (client && mode !== "choose") {
    return null;
  }

  if (client && mode === "choose") {
    return (
      <div className="book-card mb-5 rounded-2xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-champagne uppercase">
              Choose business
            </p>
            <p className="mt-1 text-sm text-muted">
              {msg || "Pick where you want to book."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setMode("closed");
              setPendingSalons(null);
              if (purpose === "join") onOpenProfile();
            }}
            className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-muted"
          >
            Stay here
          </button>
        </div>
        <div className="mt-3">
          <BookingSalonChooser
            currentSlug={slug}
            enabled
            embedded
            initialSalons={pendingSalons}
            initialCurrentSalonId={pendingCurrentSalonId}
          />
        </div>
      </div>
    );
  }

  if (mode === "closed") {
    return msg ? (
      <p className="mb-4 text-sm text-champagne">{msg}</p>
    ) : null;
  }

  return (
    <div className="book-card mb-5 rounded-2xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-champagne uppercase">
            {mode === "code" ? "Enter code" : mode === "join" ? "Join free" : "Sign in"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {mode === "join"
              ? "Join to save your details and keep a photo look book of every visit."
              : mode === "code"
                ? msg || "Check your email for the code."
                : "Sign in to see your visits and your look book."}
          </p>
        </div>
        <button
          type="button"
          className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-muted"
          onClick={() => {
            setMode("closed");
            setError("");
            setMsg("");
          }}
        >
          Close
        </button>
      </div>

      {mode === "signin" || mode === "join" ? (
        <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
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
          <label className="grid gap-1 text-xs text-muted sm:col-span-2">
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
          {mode === "signin" ? (
            <p className="sm:col-span-2 text-sm text-muted">
              New here?{" "}
              <button
                type="button"
                data-testid="member-switch-join"
                className="font-semibold text-champagne underline-offset-2 hover:underline"
                onClick={() => {
                  setMode("join");
                  setPurpose("join");
                  setError("");
                  setMsg("");
                }}
              >
                Join free
              </button>
            </p>
          ) : (
            <p className="sm:col-span-2 text-sm text-muted">
              Already a member?{" "}
              <button
                type="button"
                data-testid="member-switch-signin"
                className="font-semibold text-champagne underline-offset-2 hover:underline"
                onClick={() => {
                  setMode("signin");
                  setPurpose("signin");
                  setError("");
                  setMsg("");
                }}
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      ) : null}

      {mode === "code" ? (
        <div className="mt-4 grid gap-3 border-t border-white/10 pt-4">
          {demoCode ? (
            <p className="rounded-xl border border-[rgba(201,180,232,0.35)] bg-[rgba(201,180,232,0.1)] px-3 py-2 text-sm text-[#e0d0f5]">
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

      {error ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-[#f5a8a8]">{error}</p>
          {mode === "signin" && /no member account|join/i.test(error) ? (
            <button
              type="button"
              data-testid="member-join-from-error"
              onClick={() => {
                setMode("join");
                setPurpose("join");
                setError("");
                setMsg("");
              }}
              className="btn-solid rounded-full px-4 py-2.5 text-sm font-semibold"
            >
              Join free
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
