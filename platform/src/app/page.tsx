"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ExploreMarketplaceNav } from "@/app/explore/ExploreMarketplaceNav";
import { BeautyZentLogo } from "@/components/BeautyZentBrand";
import { invalidateFavoriteAccountSession } from "@/components/FavoriteBusinessButton";
import "@/app/explore/explore-luxe.css";
import "./home-landing.css";

const WHY_CARDS = [
  {
    title: "For clients",
    body: "Discover and reserve beauty houses near you.",
    photo: "/why-clients.jpg",
  },
  {
    title: "For houses",
    body: "List your house, appear in Explore, and take reserves.",
    photo: "/why-houses.jpg",
  },
  {
    title: "Curated",
    body: "Every house is reviewed before it goes live.",
    photo: "/why-curated.jpg",
  },
] as const;

const STEPS = [
  { n: "01", title: "Explore", body: "Browse houses near you." },
  { n: "02", title: "Reserve", body: "Pick a service and hold the time." },
  { n: "03", title: "Return", body: "Keep favorites and reserve the next visit." },
] as const;

export default function HomePage() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/account", { cache: "no-store" })
      .then((res) => {
        if (!cancelled) setSignedIn(res.ok);
      })
      .catch(() => {
        if (!cancelled) setSignedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function signOut() {
    await fetch("/api/public/account/logout", { method: "POST" });
    invalidateFavoriteAccountSession();
    setSignedIn(false);
  }

  return (
    <main className="explore-luxe home-luxe">
      <ExploreMarketplaceNav
        current="home"
        showOperatorConsole={false}
        onSignOut={signedIn ? () => void signOut() : undefined}
      />

      <section className="home-luxe__hero" aria-label="Welcome">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero-home.jpg" alt="" className="home-luxe__hero-img" />
        <div className="home-luxe__hero-gradient" aria-hidden />
        <div className="home-luxe__hero-inner">
          <div className="home-luxe__hero-copy">
            <h1 className="home-luxe__title">Discover exceptional beauty houses</h1>
            <p className="home-luxe__lede">
              Hair, skin, nails, spa, wellness and lifestyle — curated near you.
            </p>
            <div className="home-luxe__hero-cta">
              <Link href="/explore" className="home-luxe__btn-gold">
                Explore houses
              </Link>
              <Link href="/claim" className="home-luxe__btn-ghost-hero">
                List your house
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="home-luxe__why" aria-labelledby="home-why-heading">
        <header className="home-luxe__section-head">
          <p className="home-luxe__eyebrow">Why BeautyZent</p>
          <h2 id="home-why-heading">A marketplace for beauty houses</h2>
        </header>
        <div className="home-luxe__why-grid">
          {WHY_CARDS.map((card) => (
            <article key={card.title} className="home-luxe__why-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={card.photo} alt="" className="home-luxe__why-photo" />
              <div className="home-luxe__why-body">
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="home-luxe__flow" aria-labelledby="home-flow-heading">
        <header className="home-luxe__section-head">
          <p className="home-luxe__eyebrow">How it works</p>
          <h2 id="home-flow-heading">From browse to reserved</h2>
        </header>
        <ol className="home-luxe__steps">
          {STEPS.map((step) => (
            <li key={step.n}>
              <span>{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="home-luxe__cta-band" aria-labelledby="home-cta-heading">
        <h2 id="home-cta-heading">Find a house near you</h2>
        <div className="home-luxe__cta-actions">
          <Link href="/explore" className="home-luxe__btn-gold">
            Explore houses
          </Link>
          <Link href="/claim" className="home-luxe__btn-ghost-light">
            List your house
          </Link>
        </div>
      </section>

      <footer className="home-luxe__footer">
        <div className="home-luxe__footer-inner">
          <div className="home-luxe__footer-brand-block">
            <Link href="/" className="home-luxe__footer-brand" aria-label="BeautyZent Marketplace">
              <BeautyZentLogo
                variant="rose"
                size="sm"
                href={null}
                className="explore-luxe__brand-mark"
              />
              <span className="home-luxe__footer-brand-text">
                <span className="home-luxe__footer-name">BeautyZent</span>
                <span className="home-luxe__footer-sub">Marketplace</span>
              </span>
            </Link>
            <p className="home-luxe__footer-tagline">Hair, skin, nails, spa and wellness.</p>
          </div>

          <nav className="home-luxe__footer-cols" aria-label="Footer">
            <div>
              <p className="home-luxe__footer-label">Clients</p>
              <Link href="/explore">Explore</Link>
              <Link href="/account">My account</Link>
            </div>
            <div>
              <p className="home-luxe__footer-label">Houses</p>
              <Link href="/claim">List your house</Link>
            </div>
          </nav>
        </div>

        <div className="home-luxe__footer-bar">
          <p className="home-luxe__footer-copy">© 2026 BeautyZent</p>
          <div className="home-luxe__footer-legal">
            <Link href="#">Privacy</Link>
            <Link href="#">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
