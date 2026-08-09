"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DisplayBoard } from "@/app/display/[slug]/DisplayBoard";

export default function ManagerStoreDisplayPage() {
  const [slug, setSlug] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pinSet, setPinSet] = useState(false);
  const [pinMsg, setPinMsg] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const loadPin = useCallback(async () => {
    const res = await fetch("/api/admin/display-pin");
    if (res.status === 401) {
      window.location.href = "/manager/login";
      return;
    }
    if (!res.ok) return;
    const data = await res.json();
    setPinSet(Boolean(data.pinSet));
    if (data.slug) setSlug(data.slug);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/admin/salon");
      if (res.status === 401) {
        window.location.href = "/manager/login";
        return;
      }
      if (!res.ok) {
        if (!cancelled) setError("Could not load salon.");
        return;
      }
      const data = await res.json();
      if (!cancelled) setSlug(data.salon?.slug || null);
      await loadPin();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadPin]);

  async function savePin(e: React.FormEvent) {
    e.preventDefault();
    setPinError("");
    setPinMsg("");
    setPinBusy(true);
    const res = await fetch("/api/admin/display-pin", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pin: newPin,
        confirmPin,
        currentPin: pinSet ? currentPin : undefined,
      }),
    });
    const data = await res.json();
    setPinBusy(false);
    if (!res.ok) {
      setPinError(data.error || "Could not save PIN");
      return;
    }
    setPinSet(true);
    setPinMsg(data.message || "PIN saved.");
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
  }

  async function removePin(e: React.FormEvent) {
    e.preventDefault();
    setPinError("");
    setPinMsg("");
    setPinBusy(true);
    const res = await fetch("/api/admin/display-pin", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPin }),
    });
    const data = await res.json();
    setPinBusy(false);
    if (!res.ok) {
      setPinError(data.error || "Could not remove PIN");
      return;
    }
    setPinSet(false);
    setPinMsg(data.message || "PIN removed.");
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
  }

  return (
    <main className="space-y-4" data-testid="manager-store-display">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[#7d6154] uppercase">
            Dashboard
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-[#2b2521]">
            Salon display
          </h1>
          <p className="text-sm text-muted">
            Same floor board as the salon tablet — seat waitlist, check in, and complete jobs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/manager"
            className="rounded-full border border-[#7d6154]/45 px-4 py-2.5 text-sm text-[#7d6154]"
          >
            Back to Dashboard
          </Link>
          {slug ? (
            <Link
              href={`/display/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[#7d6154]/45 bg-[#7d6154] px-4 py-2.5 text-sm font-semibold text-[#fffcf9]"
            >
              Open tablet view
            </Link>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-sm text-[#b54a4a]">{error}</p> : null}
      {!slug && !error ? (
        <p className="text-sm text-muted">Loading salon display…</p>
      ) : null}
      {slug ? (
        <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 px-2 sm:px-4">
          <DisplayBoard slug={slug} embedded />
        </div>
      ) : null}

      <details
        className="rounded-2xl border border-[#7d6154]/30 bg-[#ffffff] p-4 open:pb-5"
        data-testid="manager-display-pin"
      >
        <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-[#7d6154] uppercase">
                Tablet PIN
              </p>
              <p className="mt-1 text-sm text-[#6b5b52]">
                {pinSet
                  ? "PIN is active for the public tablet URL — tap to manage."
                  : "Optional — lock the public tablet URL. Tap to set a PIN."}
              </p>
            </div>
            <span className="text-sm font-semibold text-[#7d6154]">
              {pinSet ? "Manage" : "Set PIN"}
            </span>
          </div>
        </summary>

        <div className="mt-4 border-t border-[#7d6154]/15 pt-4">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#2b2521]">
            Secure the tablet link
          </h2>
          <p className="mt-2 text-sm text-[#6b5b52]">
            {pinSet
              ? "Anyone opening the tablet URL must enter the PIN (stays unlocked on that device for 7 days)."
              : "No PIN yet — the tablet URL is open to anyone with the link. Set a 4–6 digit PIN to lock it."}
          </p>

          <form onSubmit={savePin} className="mt-4 grid gap-3 sm:grid-cols-2">
            {pinSet ? (
              <label className="grid gap-1.5 text-sm text-[#6b5b52] sm:col-span-2">
                Current PIN
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  pattern="\d{4,6}"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-[#2b2521]"
                  placeholder="••••"
                />
              </label>
            ) : null}
            <label className="grid gap-1.5 text-sm text-[#6b5b52]">
              {pinSet ? "New PIN" : "PIN (4–6 digits)"}
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                pattern="\d{4,6}"
                required
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-[#2b2521]"
                placeholder="e.g. 4829"
              />
            </label>
            <label className="grid gap-1.5 text-sm text-[#6b5b52]">
              Confirm PIN
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                pattern="\d{4,6}"
                required
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-[#2b2521]"
                placeholder="Same PIN again"
              />
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={pinBusy}
                className="btn-solid rounded-full px-5 py-2.5 text-sm"
              >
                {pinBusy ? "Saving…" : pinSet ? "Update PIN" : "Set PIN"}
              </button>
              {pinSet ? (
                <button
                  type="button"
                  disabled={pinBusy || currentPin.length < 4}
                  onClick={(e) => void removePin(e)}
                  className="rounded-full border border-[#f5a8a8]/45 px-5 py-2.5 text-sm font-semibold text-[#f5a8a8] hover:bg-[#f5a8a8]/10 disabled:opacity-50"
                >
                  Remove PIN
                </button>
              ) : null}
            </div>
          </form>
          {pinError ? <p className="mt-3 text-sm text-[#b54a4a]">{pinError}</p> : null}
          {pinMsg ? <p className="mt-3 text-sm text-[#2f6b4f]">{pinMsg}</p> : null}
        </div>
      </details>
    </main>
  );
}
