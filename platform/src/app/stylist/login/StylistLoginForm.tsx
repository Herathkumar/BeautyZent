"use client";

import { useState } from "react";
import { writeSalonBrand } from "@/lib/salon-branding";
import { DEFAULT_STYLIST_THEME_ID, applySalonThemeId } from "@/lib/salon-themes";

export type StylistLoginAccount = { email: string; name: string };

export function StylistLoginForm({
  salonSlug,
  salonId,
  salonName,
  accounts = [],
}: {
  salonSlug?: string | null;
  salonId?: string | null;
  salonName?: string | null;
  accounts?: StylistLoginAccount[];
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
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error || "Login failed");
      return;
    }
    if (data.salon?.slug && data.salon?.name) {
      writeSalonBrand(data.salon, { staff: true });
      applySalonThemeId(data.salon.stylistThemeId, DEFAULT_STYLIST_THEME_ID);
    }
    const next =
      data.user?.role && data.user.role !== "STYLIST" && !data.user.stylistId
        ? "/manager"
        : "/stylist";
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
              className={`rounded-full px-3 py-1.5 text-sm ${
                email === account.email
                  ? "stylist-btn-primary"
                  : "stylist-btn-secondary"
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
          className="stylist-tap rounded-2xl border border-ink/15 bg-cream px-4"
          value={email}
          autoComplete="username"
          inputMode="email"
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="grid gap-1.5 text-sm">
        Password
        <input
          type="password"
          className="stylist-tap rounded-2xl border border-ink/15 bg-cream px-4"
          value={password}
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {salonName ? (
        <p className="text-xs text-muted">
          Sign in with a {salonName} stylist account.
        </p>
      ) : null}
      {error ? <p className="text-sm text-[color:var(--t-danger)]">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="stylist-tap btn-solid rounded-2xl px-5"
      >
        {loading ? "Opening…" : "Sign in"}
      </button>
    </form>
  );
}
