"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PlatformLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("platform@beautyzent.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/platform/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Sign in failed");
      return;
    }
    router.push("/platform");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-ink">
          Platform sign in
        </h1>
        <p className="mt-1 text-sm text-muted">
          BeautyZent operator access. Managers and staff keep using their own portals.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4 rounded-3xl border border-ink/12 bg-white/80 p-5">
        <label className="grid gap-1.5 text-sm text-ink-soft">
          Email
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-2xl border border-ink/15 bg-white px-4 py-3 text-ink"
          />
        </label>
        <label className="grid gap-1.5 text-sm text-ink-soft">
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-2xl border border-ink/15 bg-white px-4 py-3 text-ink"
          />
        </label>
        {error ? <p className="text-sm text-[#a4432f]">{error}</p> : null}
        <button type="submit" disabled={loading} className="btn-solid rounded-2xl px-5 py-3 font-medium">
          {loading ? "Signing in…" : "Open console"}
        </button>
      </form>
    </div>
  );
}
