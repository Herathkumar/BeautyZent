"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ZentraLabFooter } from "@/components/ZentraLabFooter";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }
    if (data.user?.role === "STYLIST") {
      router.push("/stylist");
    } else {
      router.push("/manager");
    }
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-md space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-[#c9a87c]">Manager App</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[#fffaf6]">
          FHSalon
        </h1>
        <p className="mt-2 text-muted">
          Sign in with the salon manager account to manage services, stylists, and bookings.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4">
        <label className="grid gap-1.5 text-sm">
          Email
          <input
            className="rounded-2xl border border-ink/15 bg-[#2a211c] px-4 py-3 text-[#fffaf6]"
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
            className="rounded-2xl border border-ink/15 bg-[#2a211c] px-4 py-3 text-[#fffaf6]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error ? <p className="text-sm text-[#f5a8a8]">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="btn-solid rounded-2xl px-5 py-3 font-medium"
        >
          {loading ? "Opening…" : "Open FHSalon"}
        </button>
      </form>

      <div className="rounded-2xl border border-[#c9a87c]/30 bg-[#2a211c] px-4 py-4 text-sm text-muted">
        <p className="font-semibold text-[#c9a87c]">Put it on your home screen</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Open this page in Safari (iPhone) or Chrome (Android)</li>
          <li>Tap Share / menu</li>
          <li>
            Choose <span className="text-[#fffaf6]">Add to Home Screen</span>
          </li>
        </ol>
        <p className="mt-3 text-xs">
          Use the salon manager account. Change the password under Profile after first sign-in.
        </p>
      </div>

      <p className="text-sm text-muted">
        Stylist?{" "}
        <Link href="/stylist/login" className="text-[#c9a87c]">
          Stylist App
        </Link>
      </p>

      <ZentraLabFooter compact />
    </main>
  );
}
