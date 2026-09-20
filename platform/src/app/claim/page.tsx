"use client";

import Link from "next/link";
import { useState } from "react";
import { fileToBoundedJpegDataUrl } from "@/lib/photo-resize";
import { ExploreMarketplaceNav } from "../explore/ExploreMarketplaceNav";
import "../explore/explore-luxe.css";
import "./claim-luxe.css";

/** Claim category options — stored as businessType for the existing API. */
const CLAIM_CATEGORIES = [
  { id: "SALON", label: "Hair" },
  { id: "SKIN", label: "Skin" },
  { id: "NAILS", label: "Nails" },
  { id: "SPA", label: "Spa" },
  { id: "MEDSPA", label: "Medspa" },
  { id: "MAKEUP", label: "Makeup" },
  { id: "WELLNESS", label: "Wellness" },
  { id: "OTHER", label: "Other" },
] as const;

type Step = 1 | 2 | 3;

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "House" },
  { n: 2, label: "Cover" },
  { n: 3, label: "Manager" },
];

function slugifyName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export default function ClaimBusinessPage() {
  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ name: string; slug: string } | null>(null);
  const [coverImage, setCoverImage] = useState("");
  const [coverSource, setCoverSource] = useState<"upload" | "ai" | "">("");
  const [coverPrompt, setCoverPrompt] = useState("");
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverError, setCoverError] = useState("");
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [form, setForm] = useState({
    businessName: "",
    slug: "",
    businessType: "",
    city: "",
    region: "",
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
          businessType: form.businessType || "SALON",
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

  function validateStep(current: Step): string | null {
    if (current === 1) {
      if (form.businessName.trim().length < 2) return "Enter a house name.";
      if (!/^[a-z0-9-]{3,40}$/.test(form.slug)) {
        return "Slug needs 3–40 lowercase letters, numbers, or hyphens. Use Edit to fix it.";
      }
      if (!form.businessType) return "Select a category.";
      if (form.city.trim().length < 2) return "Enter a city.";
    }
    if (current === 3) {
      if (form.managerName.trim().length < 2) return "Enter your name.";
      if (!form.managerEmail.trim()) return "Enter a work email.";
      if (form.managerPassword.length < 8) return "Password must be at least 8 characters.";
    }
    return null;
  }

  function goNext() {
    setError("");
    const problem = validateStep(step);
    if (problem) {
      setError(problem);
      return;
    }
    setStep((s) => (s < 3 ? ((s + 1) as Step) : s));
  }

  function goBack() {
    setError("");
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (step !== 3) {
      goNext();
      return;
    }
    const problem = validateStep(3);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/public/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          businessType: form.businessType || "OTHER",
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

  const promptReady = coverPrompt.trim().length >= 8;
  const canGenerate =
    !coverBusy && form.businessName.trim().length >= 2 && promptReady;

  return (
    <main className="explore-luxe claim-luxe min-h-screen">
      <ExploreMarketplaceNav current="claim" />

      <section className="claim-luxe__hero-stage" aria-label="List your house">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-claim.jpg"
          alt=""
          className="claim-luxe__hero-img"
        />
        <div className="claim-luxe__hero-veil" aria-hidden />
        <div className="claim-luxe__hero-inner">
          <div className="claim-luxe__hero-copy">
            <p className="claim-luxe__eyebrow">BeautyZent</p>
            <h1 className="claim-luxe__title">List your house</h1>
            <p className="claim-luxe__lede">
              Get discovered for hair, skin, nails, spa and wellness.
            </p>
          </div>
        </div>
      </section>

      <div className="claim-luxe__page">
        <div className="claim-luxe__main">
          {done ? (
            <div className="claim-luxe__card">
              <p className="claim-luxe__eyebrow claim-luxe__eyebrow--ink">Submitted</p>
              <h2 className="claim-luxe__card-title">You&apos;re in review</h2>
              <p className="claim-luxe__card-lede">
                <strong>{done.name}</strong> (`/{done.slug}`) is pending approval. Sign in at
                the manager portal after it&apos;s published.
              </p>
              <Link href="/explore" className="claim-luxe__btn claim-luxe__btn--gold claim-luxe__done-cta">
                Back to Explore
              </Link>
            </div>
          ) : (
            <form onSubmit={(e) => void submit(e)} className="claim-luxe__card claim-luxe__form" noValidate>
              <ol className="claim-luxe__steps" aria-label="Claim steps">
                {STEPS.map((s, i) => {
                  const state =
                    step === s.n ? "is-current" : step > s.n ? "is-done" : "is-todo";
                  return (
                    <li key={s.n} className={`claim-luxe__step-item ${state}`}>
                      <span className="claim-luxe__step-num" aria-hidden>
                        {s.n}
                      </span>
                      <span className="claim-luxe__step-label">{s.label}</span>
                      {i < STEPS.length - 1 ? (
                        <span className="claim-luxe__step-sep" aria-hidden>
                          —
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ol>

              {step === 1 ? (
                <div className="claim-luxe__step" data-step="1">
                  <label className="claim-luxe__label">
                    House name
                    <input
                      required
                      value={form.businessName}
                      onChange={(e) => {
                        const value = e.target.value;
                        setField("businessName", value);
                        if (!slugTouched) setField("slug", slugifyName(value));
                      }}
                      className="claim-luxe__input"
                      placeholder="e.g. Lumina Beauty House"
                    />
                  </label>
                  <div className="claim-luxe__slug-preview">
                    {editingSlug ? (
                      <label className="claim-luxe__label">
                        Explore URL slug
                        <input
                          value={form.slug}
                          onChange={(e) => {
                            setSlugTouched(true);
                            setField("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                          }}
                          className="claim-luxe__input"
                          pattern="[a-z0-9-]{3,40}"
                          autoFocus
                        />
                      </label>
                    ) : (
                      <p className="claim-luxe__slug-line">
                        <span>
                          Will appear as /explore/{form.slug || "your-slug"}
                        </span>
                        <button
                          type="button"
                          className="claim-luxe__slug-edit"
                          onClick={() => {
                            setEditingSlug(true);
                            setSlugTouched(true);
                          }}
                        >
                          Edit
                        </button>
                      </p>
                    )}
                  </div>
                  <label className="claim-luxe__label">
                    Category
                    <select
                      required
                      value={form.businessType}
                      onChange={(e) => setField("businessType", e.target.value)}
                    >
                      <option value="">Select a category</option>
                      {CLAIM_CATEGORIES.map((t) => (
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
                        placeholder="e.g. Toronto"
                      />
                    </label>
                    <label className="claim-luxe__label">
                      Region
                      <input
                        value={form.region}
                        onChange={(e) => setField("region", e.target.value)}
                        className="claim-luxe__input"
                        placeholder="e.g. ON"
                      />
                    </label>
                  </div>
                  <label className="claim-luxe__label">
                    Short description
                    <textarea
                      value={form.description}
                      onChange={(e) => setField("description", e.target.value.slice(0, 140))}
                      rows={3}
                      maxLength={140}
                      placeholder="One sentence. What is this house known for?"
                    />
                    <span className="claim-luxe__counter">{form.description.length}/140</span>
                  </label>
                </div>
              ) : null}

              {step === 2 ? (
                <section className="claim-luxe__cover claim-luxe__step" data-step="2">
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
                      className={`claim-luxe__btn claim-luxe__btn--outline relative overflow-hidden ${
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
                        placeholder="Dark marble atelier, gold mirrors, warm evening light, no people"
                        data-testid="claim-cover-ai-prompt"
                      />
                    </label>
                    <div className="claim-luxe__ai-row">
                      <span className="claim-luxe__hint">Up to 3 AI previews per hour</span>
                      <button
                        type="button"
                        disabled={!canGenerate}
                        onClick={() => void generateCover()}
                        className={`claim-luxe__btn ${
                          promptReady ? "claim-luxe__btn--gold" : "claim-luxe__btn--outline"
                        }`}
                        data-testid="claim-cover-generate"
                      >
                        {coverBusy
                          ? "Working…"
                          : coverSource === "ai"
                            ? "Generate again"
                            : "Generate cover"}
                      </button>
                    </div>
                  </div>
                  {coverError ? <p className="claim-luxe__error">{coverError}</p> : null}
                </section>
              ) : null}

              {step === 3 ? (
                <div className="claim-luxe__step" data-step="3">
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
                </div>
              ) : null}

              {error ? <p className="claim-luxe__error">{error}</p> : null}

              <div className={`claim-luxe__nav-actions${step === 1 ? " is-primary-only" : ""}`}>
                {step > 1 ? (
                  <button
                    type="button"
                    className="claim-luxe__btn claim-luxe__btn--outline"
                    onClick={goBack}
                    disabled={busy}
                  >
                    Back
                  </button>
                ) : null}
                {step < 3 ? (
                  <button
                    type="button"
                    className="claim-luxe__btn claim-luxe__btn--gold claim-luxe__submit"
                    onClick={goNext}
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={busy}
                    className="claim-luxe__btn claim-luxe__btn--gold claim-luxe__submit"
                  >
                    {busy ? "Submitting…" : "Submit for review"}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
