"use client";

import { useState } from "react";
import { writeSalonBrand } from "@/lib/salon-branding";
import { ReceptionThemeRoot } from "@/components/display/ReceptionThemeRoot";
import { ReceptionThemeToggle } from "@/components/display/ReceptionThemeToggle";

export type ReceptionLoginAccount = { email: string; name: string; role?: string };

export function ReceptionLogin({
  slug,
  salonId,
  salonName,
  accounts = [],
  blockedReason = null,
}: {
  slug: string;
  salonId: string;
  salonName: string;
  accounts?: ReceptionLoginAccount[];
  blockedReason?: "other-salon" | null;
}) {
  const [email, setEmail] = useState(accounts[0]?.email || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    blockedReason === "other-salon"
      ? "You're signed in to a different salon. Sign out, then use an account from this salon."
      : ""
  );
  const [loading, setLoading] = useState(false);

  async function goReceptionBoard() {
    const next = `/display/${slug}/reception`;
    if (window.location.pathname.replace(/\/$/, "") === next) {
      window.location.reload();
      return;
    }
    window.location.assign(next);
  }

  async function signOutCurrent() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    await goReceptionBoard();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch(`/api/auth/login?salon=${encodeURIComponent(slug)}`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        salonSlug: slug,
        salonId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error || "Login failed");
      return;
    }
    if (data.salon?.slug && data.salon?.name) {
      writeSalonBrand(data.salon, { staff: true });
    }
    await goReceptionBoard();
  }

  return (
    <ReceptionThemeRoot className="min-h-dvh">
      <main
        className="flex h-dvh w-full items-center justify-center bg-[var(--rx-bg)] px-6 text-[color:var(--rx-text)]"
        data-testid="reception-login"
      >
        <div className="w-full max-w-md rounded-[1.75rem] border border-[color:var(--rx-line)] bg-[var(--rx-panel)] px-6 py-8 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
        <div className="mb-1 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-[color:var(--rx-accent-soft)] uppercase">
              Reception
            </p>
            <h1 className="mt-2 text-2xl font-semibold">{salonName}</h1>
          </div>
          <ReceptionThemeToggle />
        </div>
        <p className="mt-2 text-sm text-[color:var(--rx-muted)]">
          Sign in with a manager or stylist account to open the reception board.
        </p>

          {blockedReason ? (
            <button
              type="button"
              onClick={() => void signOutCurrent()}
              className="mt-4 text-sm font-semibold text-[color:var(--rx-accent-soft)] underline"
              data-testid="reception-login-sign-out"
            >
              Sign out current account
            </button>
          ) : null}

          <form onSubmit={onSubmit} className="mt-6 grid gap-4">
            {accounts.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {accounts.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => setEmail(account.email)}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      email === account.email
                        ? "border-[color:var(--rx-accent)] bg-[var(--rx-accent)] text-white"
                        : "border-[color:var(--rx-line)] text-[color:var(--rx-muted)]"
                    }`}
                  >
                    {account.name.split(" ")[0] || account.email}
                  </button>
                ))}
              </div>
            ) : null}
            <label className="grid gap-1.5 text-sm">
              Email
              <input
                className="rounded-2xl border border-[color:var(--rx-line)] bg-[var(--rx-input)] px-4 py-3 text-[color:var(--rx-text)]"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="reception-login-email"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              Password
              <input
                type="password"
                autoComplete="current-password"
                className="rounded-2xl border border-[color:var(--rx-line)] bg-[var(--rx-input)] px-4 py-3 text-[color:var(--rx-text)]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="reception-login-password"
              />
            </label>
            {error ? (
              <p className="text-sm text-[#f5a8a8]" data-testid="reception-login-error">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-[var(--rx-accent)] px-5 py-3 font-medium text-white disabled:opacity-50"
              data-testid="reception-login-submit"
            >
              {loading ? "Opening…" : "Sign in"}
            </button>
          </form>
        </div>
      </main>
    </ReceptionThemeRoot>
  );
}
