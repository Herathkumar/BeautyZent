"use client";

import Link from "next/link";
import { useState } from "react";
import { BeautyZentLogo } from "@/components/BeautyZentBrand";
import { BUSINESS_TYPES } from "@/lib/marketplace";
import { fileToBoundedJpegDataUrl } from "@/lib/photo-resize";
import "../explore/explore-luxe.css";
import "./claim-luxe.css";

function IconProfile({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <circle cx="12" cy="8.5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5.5 20a6.5 6.5 0 0 1 13 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ClaimBusinessPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ name: string; slug: string } | null>(null);
  const [coverImage, setCoverImage] = useState("");
  const [coverSource, setCoverSource] = useState<"upload" | "ai" | "">("");
  const [coverPrompt, setCoverPrompt] = useState("");
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverError, setCoverError] = useState("");
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

  async function pickCover(file: File | null) {
    if (!file) return;
    setCoverBusy(true);
    setCoverError("");
    try {
      setCoverImage(await fileToBoundedJpegDataUrl(file, 900_000));
      setCoverSource("upload");
    } catch (err) {
      setCoverError(err instanceof Error ? err.message : "Could not read that image");
    } finally {
      setCoverBusy(false);
    }
  }

  async function generateCover() {
    setCoverBusy(true);
    setCoverError("");
    try {
      const res = await fetch("/api/public/claim/cover-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: form.businessName,
          businessType: form.businessType,
          prompt: coverPrompt,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not generate cover");
      setCoverImage(data.imageBase64 || "");
      setCoverSource("ai");
    } catch (err) {
      setCoverError(err instanceof Error ? err.message : "Could not generate cover");
    } finally {
      setCoverBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/public/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          coverImageBase64: coverImage || undefined,
          coverMimeType: coverImage ? "image/jpeg" : undefined,
        }),
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
    <main className="explore-luxe min-h-screen">
      <header className="explore-luxe__topbar">
        <div className="explore-luxe__topbar-inner explore-luxe__topbar-inner--end">
          <nav className="explore-luxe__top-links" aria-label="Marketplace">
            <Link href="/">Home</Link>
            <Link href="/explore">Explore</Link>
            <Link href="/account" className="explore-luxe__account-btn">
              <IconProfile className="h-4 w-4" />
              My account
            </Link>
          </nav>
        </div>
      </header>

      <div className="explore-luxe__shell">
        <header className="explore-luxe__hero">
          <BeautyZentLogo
            variant="rose"
            size="lg"
            href={null}
            priority
            className="explore-luxe__hero-mark"
          />
          <div className="explore-luxe__hero-copy">
            <p className="explore-luxe__kicker">BeautyZent marketplace</p>
            <h1 className="explore-luxe__title">Grow with ease</h1>
            <p className="explore-luxe__lede">
              Claim your listing, get discovered, and fill your chair with ready-to-book
              clients.
            </p>
          </div>
        </header>

        {done ? (
          <div className="claim-luxe__card">
            <p className="explore-luxe__kicker">Submitted</p>
            <h2 className="explore-luxe__title">You&apos;re in review</h2>
            <p className="explore-luxe__lede">
              <strong>{done.name}</strong> (`/{done.slug}`) is pending approval. Sign in at
              the manager portal after it&apos;s published.
            </p>
            <Link href="/explore" className="claim-luxe__btn claim-luxe__btn--rose claim-luxe__done-cta">
              Back to Explore
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="claim-luxe__card claim-luxe__form">
            <label className="claim-luxe__label">
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
                className="claim-luxe__input"
              />
            </label>
            <label className="claim-luxe__label">
              Booking URL slug
              <input
                required
                value={form.slug}
                onChange={(e) => setField("slug", e.target.value)}
                className="claim-luxe__input"
                pattern="[a-z0-9-]{3,40}"
              />
              <span className="claim-luxe__hint">/book/{form.slug || "your-slug"}</span>
            </label>
            <label className="claim-luxe__label">
              Business type
              <select
                value={form.businessType}
                onChange={(e) => setField("businessType", e.target.value)}
              >
                {BUSINESS_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="claim-luxe__row">
              <label className="claim-luxe__label">
                City
                <input
                  required
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                  className="claim-luxe__input"
                />
              </label>
              <label className="claim-luxe__label">
                Region
                <input
                  value={form.region}
                  onChange={(e) => setField("region", e.target.value)}
                  className="claim-luxe__input"
                />
              </label>
            </div>
            <label className="claim-luxe__label">
              Short description
              <textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                rows={3}
                maxLength={500}
              />
            </label>
            <section className="claim-luxe__cover">
              <div>
                <h3>Business card cover</h3>
                <p className="claim-luxe__hint">
                  Upload your own photo or generate one with AI. You can change it later from
                  Manager Account.
                </p>
              </div>
              {coverImage ? (
                <div className="claim-luxe__preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverImage}
                    alt="Business card cover preview"
                    data-testid="claim-cover-preview"
                  />
                  <span className="claim-luxe__badge">
                    {coverSource === "ai" ? "AI preview" : "Uploaded"}
                  </span>
                </div>
              ) : null}
              <div className="claim-luxe__actions">
                <label
                  className={`claim-luxe__btn claim-luxe__btn--peach relative overflow-hidden ${
                    coverBusy ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  <span className="pointer-events-none">
                    {coverSource === "upload" ? "Choose another photo" : "Upload photo"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={coverBusy}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    data-testid="claim-cover-upload"
                    onChange={(e) => {
                      void pickCover(e.target.files?.[0] ?? null);
                      e.target.value = "";
                    }}
                  />
                </label>
                {coverImage ? (
                  <button
                    type="button"
                    disabled={coverBusy}
                    onClick={() => {
                      setCoverImage("");
                      setCoverSource("");
                      setCoverError("");
                    }}
                    className="claim-luxe__btn claim-luxe__btn--remove"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <div className="claim-luxe__ai">
                <label className="claim-luxe__label">
                  Generate with AI
                  <textarea
                    value={coverPrompt}
                    onChange={(e) => setCoverPrompt(e.target.value)}
                    rows={2}
                    maxLength={400}
                    placeholder="Example: A bright modern salon with cream chairs, plants, and warm lighting"
                    data-testid="claim-cover-ai-prompt"
                  />
                </label>
                <div className="flex items-center justify-between gap-3">
                  <span className="claim-luxe__hint">Up to 3 AI previews per hour</span>
                  <button
                    type="button"
                    disabled={
                      coverBusy ||
                      form.businessName.trim().length < 2 ||
                      coverPrompt.trim().length < 8
                    }
                    onClick={() => void generateCover()}
                    className="claim-luxe__btn claim-luxe__btn--ghost"
                    data-testid="claim-cover-generate"
                  >
                    {coverBusy ? "Working…" : coverSource === "ai" ? "Generate again" : "Generate cover"}
                  </button>
                </div>
              </div>
              {coverError ? <p className="claim-luxe__error">{coverError}</p> : null}
            </section>
            <label className="claim-luxe__label">
              Address
              <input
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
                className="claim-luxe__input"
              />
            </label>
            <label className="claim-luxe__label">
              Phone
              <input
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                className="claim-luxe__input"
              />
            </label>

            <p className="claim-luxe__section-label">Manager login</p>
            <label className="claim-luxe__label">
              Your name
              <input
                required
                value={form.managerName}
                onChange={(e) => setField("managerName", e.target.value)}
                className="claim-luxe__input"
              />
            </label>
            <label className="claim-luxe__label">
              Work email
              <input
                required
                type="email"
                value={form.managerEmail}
                onChange={(e) => setField("managerEmail", e.target.value)}
                className="claim-luxe__input"
              />
            </label>
            <label className="claim-luxe__label">
              Password (min 8)
              <input
                required
                type="password"
                minLength={8}
                value={form.managerPassword}
                onChange={(e) => setField("managerPassword", e.target.value)}
                className="claim-luxe__input"
              />
            </label>

            {error ? <p className="claim-luxe__error">{error}</p> : null}

            <button
              type="submit"
              disabled={busy}
              className="claim-luxe__btn claim-luxe__btn--rose claim-luxe__submit"
            >
              {busy ? "Submitting…" : "Submit for review"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
