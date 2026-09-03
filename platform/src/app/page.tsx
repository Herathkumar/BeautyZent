import Link from "next/link";
import { BeautyZentLogo, BEAUTYZENT } from "@/components/BeautyZentBrand";
import "./home-landing.css";

export default function HomePage() {
  return (
    <main className="home-luxe">
      <section className="home-luxe__hero">
        <div className="home-luxe__hero-bg" aria-hidden />
        <div className="home-luxe__hero-veil" aria-hidden />

        <header className="home-luxe__top">
          <Link href="/account" className="home-luxe__nav-account">
            My account
          </Link>
        </header>

        <div className="home-luxe__hero-copy">
          <BeautyZentLogo
            variant="rose"
            size="hero"
            href={null}
            priority
            className="home-luxe__mark"
          />
          <h1 className="home-luxe__title">Your next glow is one booking away</h1>
          <p className="home-luxe__lede home-luxe__lede--desk">
            Find trusted salons and stylists near you — book in seconds, or grow your chair
            with clients who are ready.
          </p>
          <p className="home-luxe__lede home-luxe__lede--mobile">
            Discover top-rated salons and beauty professionals near you, or grow your beauty
            business with our trusted marketplace.
          </p>
          <div className="home-luxe__hero-cta">
            <Link href="/explore" className="home-luxe__btn-primary">
              Find a beauty business
              <span className="home-luxe__btn-chevron" aria-hidden>
                ›
              </span>
            </Link>
            <Link href="/claim" className="home-luxe__btn-ghost">
              List your business
              <span className="home-luxe__btn-chevron" aria-hidden>
                ›
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className="home-luxe__paths" aria-label="Choose your path">
        <article className="home-luxe__path">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="home-luxe__path-photo"
            src="/brand/beautyzent-spa-cover.jpg"
            alt=""
          />
          <div className="home-luxe__path-body">
            <p className="home-luxe__path-kicker">For clients</p>
            <h2>Feel the glow</h2>
            <p>Browse trusted salons &amp; stylists near you. Book instantly and keep your look book.</p>
            <ul>
              <li>Instant online booking</li>
              <li>Personalized style previews</li>
              <li>Rewards &amp; member perks</li>
            </ul>
            <Link href="/explore" className="home-luxe__btn-primary">
              Explore businesses
            </Link>
          </div>
        </article>

        <article className="home-luxe__path">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="home-luxe__path-photo"
            src="/brand/beautyzent-aaraby-cover.jpg"
            alt=""
          />
          <div className="home-luxe__path-body">
            <p className="home-luxe__path-kicker">For businesses</p>
            <h2>Grow with ease</h2>
            <p>
              Claim your listing, get discovered, and fill your chair with ready-to-book
              clients.
            </p>
            <ul>
              <li>Client &amp; appointment tools</li>
              <li>Loyalty and offers</li>
              <li>Public explore listing</li>
            </ul>
            <Link href="/claim" className="home-luxe__btn-primary">
              Claim or create business
            </Link>
          </div>
        </article>
      </section>

      <section className="home-luxe__pillars">
        <header className="home-luxe__section-head">
          <p className="home-luxe__path-kicker">Why BeautyZent</p>
          <h2>Built for discovery and growth</h2>
        </header>

        <div className="home-luxe__sphere-grid">
          <Link href="/explore" className="home-luxe__sphere">
            <div className="home-luxe__sphere-orb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/beautyzent-spa-cover.jpg" alt="" />
            </div>
            <div className="home-luxe__sphere-base" aria-hidden />
            <div className="home-luxe__sphere-float home-luxe__sphere-float--a">
              Instant booking
            </div>
            <div className="home-luxe__sphere-float home-luxe__sphere-float--b">
              Virtual consultations
            </div>
            <div className="home-luxe__sphere-float home-luxe__sphere-float--c">
              Personalized picks
            </div>
            <h3>Feel the glow</h3>
            <p>Book trusted beauty visits with clear menus, hours, and pricing.</p>
          </Link>

          <Link href="/claim" className="home-luxe__sphere">
            <div className="home-luxe__sphere-orb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/beautyzent-aaraby-cover.jpg" alt="" />
            </div>
            <div className="home-luxe__sphere-base" aria-hidden />
            <div className="home-luxe__sphere-float home-luxe__sphere-float--a">
              Client management
            </div>
            <div className="home-luxe__sphere-float home-luxe__sphere-float--b">
              Growth analytics
            </div>
            <div className="home-luxe__sphere-float home-luxe__sphere-float--c">
              Marketing tools
            </div>
            <h3>Grow with ease</h3>
            <p>Claim your listing and welcome marketplace clients into your chair.</p>
          </Link>

          <Link href="/explore" className="home-luxe__sphere">
            <div className="home-luxe__sphere-orb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/display-promo.jpg" alt="" />
            </div>
            <div className="home-luxe__sphere-base" aria-hidden />
            <div className="home-luxe__sphere-float home-luxe__sphere-float--a">
              Curated listings
            </div>
            <div className="home-luxe__sphere-float home-luxe__sphere-float--b">
              Service menus
            </div>
            <div className="home-luxe__sphere-float home-luxe__sphere-float--c">
              Save favorites
            </div>
            <h3>Discover top talent</h3>
            <p>Find salons and stylists by service, location, and availability.</p>
          </Link>
        </div>
      </section>

      <section className="home-luxe__flow" aria-labelledby="home-flow-heading">
        <header className="home-luxe__section-head">
          <p className="home-luxe__path-kicker">How it works</p>
          <h2 id="home-flow-heading">From browse to booked</h2>
        </header>
        <ol className="home-luxe__steps">
          <li>
            <span>01</span>
            <h3>Explore</h3>
            <p>Browse real menus, hours, and availability from businesses near you.</p>
          </li>
          <li>
            <span>02</span>
            <h3>Book</h3>
            <p>Pick a time that fits and hold your chair — no phone tag, no guesswork.</p>
          </li>
          <li>
            <span>03</span>
            <h3>Return</h3>
            <p>Keep your look book, earn rewards, and book the next visit in a tap.</p>
          </li>
        </ol>
      </section>

      <section className="home-luxe__finale">
        <div className="home-luxe__finale-frame">
          <p className="home-luxe__path-kicker">Start today</p>
          <h2>Find your people. Book your glow.</h2>
          <p>
            Whether you&apos;re looking for your next appointment or ready to grow your shop,
            BeautyZent connects both sides of the chair.
          </p>
          <div className="home-luxe__hero-cta">
            <Link href="/explore" className="home-luxe__btn-primary">
              Explore marketplace
            </Link>
            <Link href="/claim" className="home-luxe__btn-ghost">
              Partner with us
            </Link>
          </div>
        </div>
      </section>

      <footer className="home-luxe__footer">
        <div className="home-luxe__footer-inner">
          <div className="home-luxe__footer-brand">
            <BeautyZentLogo variant="gold" size="md" href={null} />
            <div>
              <p>{BEAUTYZENT.name}</p>
              <p>{BEAUTYZENT.tagline}</p>
            </div>
          </div>

          <div className="home-luxe__footer-cols">
            <div>
              <p className="home-luxe__footer-label">Clients</p>
              <Link href="/explore">Explore businesses</Link>
              <Link href="/account">My account</Link>
            </div>
            <div>
              <p className="home-luxe__footer-label">Businesses</p>
              <Link href="/claim">Claim or create</Link>
              <Link href="/platform/login">Platform</Link>
              <Link href="/manager">Manager portal</Link>
            </div>
            <div>
              <p className="home-luxe__footer-label">Company</p>
              <Link href="/explore">Marketplace</Link>
              <Link href="/claim">Partner with us</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
