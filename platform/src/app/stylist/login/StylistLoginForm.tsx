"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { writeSalonBrand } from "@/lib/salon-branding";
import { DEFAULT_STYLIST_THEME_ID, applySalonThemeId } from "@/lib/salon-themes";

export type StylistLoginAccount = { email: string; name: string };

export function StylistLoginForm({
  salonSlug,
  salonName,
  accounts = [],
}: {
  salonSlug?: string | null;
  salonName?: string | null;
  accounts?: StylistLoginAccount[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState(accounts[0]?.email || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!salonSlug) return;
    void fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
  }, [salonSlug]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        ...(salonSlug ? { salonSlug } : {}),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }
    if (data.salon?.slug && data.salon?.name) {
      writeSalonBrand(data.salon, { staff: true });
      applySalonThemeId(data.salon.stylistThemeId, DEFAULT_STYLIST_THEME_ID);
    }
    if (data.user?.role && data.user.role !== "STYLIST" && !data.user.stylistId) {
      router.push("/manager");
      return;
    }
    router.push("/stylist");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
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
