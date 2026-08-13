"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { writeSalonBrand } from "@/lib/salon-branding";
import { DEFAULT_MANAGER_THEME_ID, applySalonThemeId } from "@/lib/salon-themes";

export type ManagerLoginAccount = { email: string; name: string };

export function ManagerLoginForm({
  salonSlug,
  salonName,
  accounts = [],
}: {
  salonSlug?: string | null;
  salonName?: string | null;
  accounts?: ManagerLoginAccount[];
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
    if (data.user?.role === "STYLIST") {
      router.push("/stylist");
    } else {
      router.push("/manager");
    }
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
