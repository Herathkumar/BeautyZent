"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    <main className="mx-auto max-w-md">
      <p className="text-xs font-semibold tracking-[0.2em] text-[#c9a87c] uppercase">
        Manager App
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#fffaf6]">
        ZLab-Salon
      </h1>
      <p className="mt-2 text-sm text-muted">
        Sign in with the salon manager account to manage services, stylists, and bookings.
      </p>
      <form
        onSubmit={onSubmit}
        className="mt-6 grid gap-3 rounded-2xl border border-[#c9a87c]/30 bg-[#2a211c] p-5"
      >
        <label className="grid gap-1 text-sm">
          Email
          <input
            className="rounded-xl border border-ink/15 px-3 py-2"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Password
          <input
            type="password"
            autoComplete="current-password"
            className="rounded-xl border border-ink/15 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="btn-solid rounded-full px-5 py-3 font-medium"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <ZentraLabFooter compact />
    </main>
  );
}
