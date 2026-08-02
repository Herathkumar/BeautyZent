"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function StylistLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("farzana@fhsalon.ca");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }
    if (data.user?.role && data.user.role !== "STYLIST") {
      router.push("/admin");
      return;
    }
    router.push("/stylist");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-md space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-champagne">Stylist phone app</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">My Day</h1>
        <p className="mt-2 text-muted">
          See today&apos;s clients, tap when they arrive, call them, and mark days off — no app
          store install.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4">
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
        {error ? <p className="text-sm text-[#f5a8a8]">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="stylist-tap btn-solid rounded-2xl px-5"
        >
          {loading ? "Opening…" : "Open my day"}
        </button>
      </form>

      <div className="rounded-2xl border border-ink/15 bg-cream px-4 py-4 text-sm text-muted">
        <p className="font-semibold text-champagne">Put it on your home screen</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Open this page in Safari (iPhone) or Chrome (Android)</li>
          <li>Tap Share / menu</li>
          <li>Choose <span className="text-ink-soft">Add to Home Screen</span></li>
        </ol>
        <p className="mt-3 text-xs">Demo: farzana@fhsalon.ca · demo1234</p>
      </div>

      <p className="text-sm text-muted">
        Salon admin?{" "}
        <Link href="/admin/login" className="text-champagne">
          Admin portal
        </Link>
      </p>
    </main>
  );
}
