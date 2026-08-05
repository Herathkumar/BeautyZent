"use client";

import { useState } from "react";

type Props = {
  slug: string;
  salonName?: string;
  onUnlocked: () => void;
};

export function DisplayPinPad({ slug, salonName, onUnlocked }: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(nextPin: string) {
    if (nextPin.length < 4) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/display/${slug}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: nextPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Incorrect PIN.");
        setPin("");
        return;
      }
      onUnlocked();
    } catch {
      setError("Could not unlock. Try again.");
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  function press(digit: string) {
    if (busy) return;
    setError("");
    setPin((prev) => (prev.length >= 6 ? prev : prev + digit));
  }

  function backspace() {
    if (busy) return;
    setError("");
    setPin((p) => p.slice(0, -1));
  }

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-[#1c1714] px-6 py-10 text-[#fffaf6]"
      data-testid="display-pin-pad"
    >
      <p className="text-xs font-semibold tracking-[0.2em] text-[#c9a87c] uppercase">
        Store display
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
        {salonName || "Enter PIN"}
      </h1>
      <p className="mt-2 max-w-sm text-center text-sm text-white/60">
        This board is locked. Enter the PIN set by the salon manager.
      </p>

      <div className="mt-8 flex gap-2" aria-label="PIN digits entered">
        {Array.from({ length: Math.max(4, pin.length || 4) }).map((_, i) => (
          <span
            key={i}
            className={`h-3 w-3 rounded-full ${
              i < pin.length ? "bg-[#f0c987]" : "bg-white/20"
            }`}
          />
        ))}
      </div>

      {error ? <p className="mt-4 text-sm text-[#f5a8a8]">{error}</p> : null}
      {busy ? <p className="mt-4 text-sm text-[#f0c987]">Unlocking…</p> : null}

      <div className="mt-8 grid w-full max-w-xs grid-cols-3 gap-3">
        {keys.map((k, i) =>
          k === "" ? (
            <span key={`empty-${i}`} />
          ) : (
            <button
              key={k === "⌫" ? "back" : k}
              type="button"
              disabled={busy}
              onClick={() => (k === "⌫" ? backspace() : press(k))}
              className="rounded-2xl border border-white/15 bg-white/5 py-4 text-xl font-semibold text-[#fffaf6] hover:bg-white/10 disabled:opacity-50"
            >
              {k}
            </button>
          )
        )}
      </div>

      <button
        type="button"
        disabled={busy || pin.length < 4}
        onClick={() => void submit(pin)}
        className="mt-6 rounded-full bg-[#c9a87c] px-8 py-3 text-sm font-bold text-[#1c1714] disabled:opacity-50"
      >
        Unlock
      </button>
    </div>
  );
}
