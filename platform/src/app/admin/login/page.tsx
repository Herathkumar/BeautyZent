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
        <p className="text-sm uppercase tracking-[0.18em] text-[#7d6154]">Manager</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[#2b2521]">
          Farzana <span className="text-[#7d6154]">Hair Salon</span>
        </h1>
        <p className="mt-2 text-muted">
          Sign in with the salon manager account to manage services, stylists, and bookings.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4">
        <label className="grid gap-1.5 text-sm">
          Email
          <input
            className="rounded-2xl border border-ink/15 bg-[#ffffff] px-4 py-3 text-[#2b2521]"
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
            className="rounded-2xl border border-ink/15 bg-[#ffffff] px-4 py-3 text-[#2b2521]"
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

      <div className="rounded-2xl border border-[#7d6154]/30 bg-[#ffffff] px-4 py-4 text-sm text-muted">
        <p className="font-semibold text-[#7d6154]">Put it on your home screen</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Open this page in Safari (iPhone) or Chrome (Android)</li>
          <li>Tap Share / menu</li>
          <li>
            Choose <span className="text-[#2b2521]">Add to Home Screen</span>
          </li>
        </ol>
        <p className="mt-3 text-xs">
          Saves as <span className="text-[#2b2521]">FHSalon Manager</span> with the gold salon icon.
          Use the salon manager account — change the password under Profile after first sign-in.
        </p>
      </div>

      <p className="text-sm text-muted">
        Stylist?{" "}
        <Link href="/stylist/login" className="text-[#7d6154]">
          Stylist App
        </Link>
      </p>

      <ZentraLabFooter compact />
    </main>
  );
}
