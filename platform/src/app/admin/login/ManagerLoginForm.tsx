"use client";

import { useState } from "react";
import { writeSalonBrand } from "@/lib/salon-branding";
import { DEFAULT_MANAGER_THEME_ID, applySalonThemeId } from "@/lib/salon-themes";

export type ManagerLoginAccount = { email: string; name: string };

export function ManagerLoginForm({
  salonSlug,
  salonId,
  salonName,
  accounts = [],
}: {
  salonSlug?: string | null;
  salonId?: string | null;
  salonName?: string | null;
  accounts?: ManagerLoginAccount[];
}) {
  const [email, setEmail] = useState(accounts[0]?.email || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const slugFromUrl =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("salon")
        : null;
    const slug = (salonSlug || slugFromUrl || "").trim();
    const loginUrl = slug
      ? `/api/auth/login?salon=${encodeURIComponent(slug)}`
      : "/api/auth/login";
    const res = await fetch(loginUrl, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        ...(slug ? { salonSlug: slug } : {}),
        ...(salonId ? { salonId } : {}),
      }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }
    if (data.salon?.slug && data.salon?.name) {
      writeSalonBrand(data.salon, { staff: true });
      applySalonThemeId(data.salon.managerThemeId, DEFAULT_MANAGER_THEME_ID);
    }
    const next = data.user?.role === "STYLIST" ? "/stylist" : "/manager";
    window.location.assign(next);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {salonSlug ? <input type="hidden" name="salon" value={salonSlug} /> : null}
      {salonId ? <input type="hidden" name="salonId" value={salonId} /> : null}
      {accounts.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {accounts.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => setEmail(account.email)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                email === account.email
                  ? "border-ink bg-ink text-white"
                  : "border-ink/20 text-ink-soft"
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
          className="rounded-2xl border border-ink/15 bg-white px-4 py-3 text-ink"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="grid gap-1.5 text-sm">
        Password
        <input
          type="password"
          autoComplete="current-password"
          className="rounded-2xl border border-ink/15 bg-white px-4 py-3 text-ink"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {salonName ? (
        <p className="text-xs text-muted">
          Sign in with a {salonName} manager account.
        </p>
      ) : null}
      {error ? <p className="text-sm text-[color:var(--t-danger)]">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="btn-solid rounded-2xl px-5 py-3 font-medium"
      >
        {loading ? "Opening…" : "Sign in"}
      </button>
    </form>
  );
}
