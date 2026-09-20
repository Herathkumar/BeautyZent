"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BeautyZentLogo } from "@/components/BeautyZentBrand";

const DEV_EMAIL =
  process.env.NODE_ENV === "development" ? "platform@beautyzent.local" : "";

export default function PlatformLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(DEV_EMAIL);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="platform-login">
      <div className="platform-login__card">
        <Link href="/" className="platform-login__brand" aria-label="BeautyZent Marketplace">
          <BeautyZentLogo
            variant="rose"
            size="sm"
            href={null}
            priority
            className="explore-luxe__brand-mark"
          />
          <span className="platform-login__brand-text">
            <span className="platform-login__brand-name">BeautyZent</span>
            <span className="platform-login__brand-sub">Marketplace</span>
          </span>
        </Link>

        <p className="platform-login__eyebrow">Operator</p>
        <h1 className="platform-login__title">Sign in to the console</h1>
        <p className="platform-login__sub">House managers use their own portal.</p>

        <form onSubmit={onSubmit} className="platform-login__form">
          <label className="platform-login__field">
            <span className="sr-only">Email</span>
            <span className="platform-login__icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M4 7.5 12 13l8-5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <input
              type="email"
              autoComplete="username"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="platform-login__field">
            <span className="sr-only">Password</span>
            <span className="platform-login__icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="5" y="10.5" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="platform-login__reveal"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((v) => !v)}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                {showPassword ? (
                  <>
                    <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path
                      d="M10.6 10.7a2.5 2.5 0 0 0 3.5 3.5M9.9 5.5A10.5 10.5 0 0 1 12 5.2c5.2 0 9.2 3.6 10.5 6.8-.5 1.2-1.4 2.6-2.7 3.8M6.2 6.4C4.4 7.7 3.1 9.4 2.5 10.8c1.3 3.2 5.3 6.8 10.5 6.8 1.1 0 2.1-.15 3.1-.4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </>
                ) : (
                  <>
                    <path
                      d="M2.5 12C3.8 8.8 7.8 5.2 13 5.2s9.2 3.6 10.5 6.8C22.2 15.2 18.2 18.8 13 18.8S3.8 15.2 2.5 12Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <circle cx="13" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.5" />
                  </>
                )}
              </svg>
            </button>
          </label>

          {error ? <p className="platform-login__error">{error}</p> : null}

          <button type="submit" disabled={loading} className="platform-login__submit">
            {loading ? "Signing in…" : "Open console"}
          </button>
        </form>

        <Link href="/" className="platform-login__back">
          ← Marketplace
        </Link>
      </div>
    </div>
  );
}
