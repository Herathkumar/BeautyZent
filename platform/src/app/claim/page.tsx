"use client";

import Link from "next/link";
import { useState } from "react";
import { BUSINESS_TYPES } from "@/lib/marketplace";

export default function ClaimBusinessPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ name: string; slug: string } | null>(null);
  const [form, setForm] = useState({
    businessName: "",
    slug: "",
    businessType: "SALON",
    city: "",
    region: "ON",
    country: "CA",
    description: "",
    phone: "",
    address: "",
    managerName: "",
    managerEmail: "",
    managerPassword: "",
  });

  function setField(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/public/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not submit");
      setDone({ name: data.business.name, slug: data.business.slug });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f2ec]">
      <div className="border-b border-ink/10 bg-white/70">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/explore" className="text-sm font-semibold text-ink">
            ← Explore
          </Link>
          <Link href="/platform/login" className="text-sm text-muted hover:text-ink">
            Platform login
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <p className="text-xs font-semibold tracking-[0.18em] text-cocoa uppercase">
          List your business
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-ink">
          Claim or create
        </h1>
        <p className="mt-3 text-muted">
          Submit your shop for review. After a platform admin publishes it, clients can find
          you on Explore and book online.
        </p>

        {done ? (
          <div className="mt-8 rounded-3xl border border-ink/12 bg-white p-6">
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-ink">
              Submitted
            </h2>
            <p className="mt-2 text-sm text-muted">
              <strong className="text-ink">{done.name}</strong> (`/{done.slug}`) is pending
              approval. Sign in at the manager portal after it&apos;s published.
            </p>
            <Link
              href="/explore"
              className="btn-solid mt-5 inline-flex rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              Back to Explore
            </Link>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="mt-8 grid gap-4 rounded-3xl border border-ink/12 bg-white p-5 sm:p-6"
          >
            <label className="grid gap-1 text-sm">
              Business name
              <input
                required
                value={form.businessName}
                onChange={(e) => {
                  setField("businessName", e.target.value);
                  if (!form.slug) {
                    setField(
                      "slug",
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-|-$/g, "")
                        .slice(0, 40)
                    );
                  }
                }}
                className="rounded-xl border border-ink/15 px-3 py-2.5"
              />
            </label>
            <label className="grid gap-1 text-sm">
              Booking URL slug
              <input
                required
                value={form.slug}
                onChange={(e) => setField("slug", e.target.value)}
                className="rounded-xl border border-ink/15 px-3 py-2.5"
                pattern="[a-z0-9-]{3,40}"
              />
              <span className="text-xs text-muted">/book/{form.slug || "your-slug"}</span>
            </label>
            <label className="grid gap-1 text-sm">
              Business type
              <select
                value={form.businessType}
                onChange={(e) => setField("businessType", e.target.value)}
                className="rounded-xl border border-ink/15 px-3 py-2.5"
              >
                {BUSINESS_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                City
                <input
                  required
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                  className="rounded-xl border border-ink/15 px-3 py-2.5"
                />
              </label>
              <label className="grid gap-1 text-sm">
                Region
                <input
                  value={form.region}
                  onChange={(e) => setField("region", e.target.value)}
                  className="rounded-xl border border-ink/15 px-3 py-2.5"
                />
              </label>
            </div>
            <label className="grid gap-1 text-sm">
              Short description
              <textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                rows={3}
                className="rounded-xl border border-ink/15 px-3 py-2.5"
                maxLength={500}
              />
            </label>
            <label className="grid gap-1 text-sm">
              Address
              <input
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
                className="rounded-xl border border-ink/15 px-3 py-2.5"
              />
            </label>
            <label className="grid gap-1 text-sm">
              Phone
              <input
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                className="rounded-xl border border-ink/15 px-3 py-2.5"
              />
            </label>

            <p className="mt-2 text-xs font-semibold tracking-[0.14em] text-cocoa uppercase">
              Manager login
            </p>
            <label className="grid gap-1 text-sm">
              Your name
              <input
                required
                value={form.managerName}
                onChange={(e) => setField("managerName", e.target.value)}
                className="rounded-xl border border-ink/15 px-3 py-2.5"
              />
            </label>
            <label className="grid gap-1 text-sm">
              Work email
              <input
                required
                type="email"
                value={form.managerEmail}
                onChange={(e) => setField("managerEmail", e.target.value)}
                className="rounded-xl border border-ink/15 px-3 py-2.5"
              />
            </label>
            <label className="grid gap-1 text-sm">
              Password (min 8)
              <input
                required
                type="password"
                minLength={8}
                value={form.managerPassword}
                onChange={(e) => setField("managerPassword", e.target.value)}
                className="rounded-xl border border-ink/15 px-3 py-2.5"
              />
            </label>

            {error ? <p className="text-sm text-[#8a4a37]">{error}</p> : null}

            <button
              type="submit"
              disabled={busy}
              className="btn-solid mt-2 rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-60"
            >
              {busy ? "Submitting…" : "Submit for review"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
