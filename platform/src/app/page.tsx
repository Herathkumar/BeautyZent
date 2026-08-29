import Link from "next/link";
import { BeautyZentLogo, BEAUTYZENT } from "@/components/BeautyZentBrand";

export default function HomePage() {
  const slug = process.env.NEXT_PUBLIC_DEFAULT_SALON_SLUG || "fhsalon";

  return (
    <main className="min-h-screen bg-[#f7f2ec]">
      <div className="mx-auto flex w-full max-w-3xl flex-col justify-center gap-8 px-6 py-12 sm:py-16">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <BeautyZentLogo variant="light" size="hero" href={null} priority />
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-cocoa uppercase">
              {BEAUTYZENT.tagline}
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-4xl leading-none tracking-tight text-ink sm:text-5xl">
              Book beauty &amp; personal care near you
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted">
              {BEAUTYZENT.name} connects salons, barbers, spas, and similar businesses with
              clients — online booking, memberships, and shop tools in one place.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/explore" className="btn-solid rounded-full px-5 py-3 font-medium">
            Explore businesses
          </Link>
          <Link
            href="/claim"
            className="rounded-full border border-ink px-5 py-3 font-medium text-ink hover:bg-ink hover:text-[#fffaf6]"
          >
            List your business
          </Link>
          <Link
            href={`/book/${slug}`}
            className="rounded-full border border-ink/20 px-5 py-3 font-medium text-ink-soft hover:border-ink"
          >
            Demo booking
          </Link>
          <Link
            href="/platform/login"
            className="rounded-full border border-ink/20 px-5 py-3 font-medium text-ink-soft hover:border-ink"
          >
            Platform admin
          </Link>
          <Link
            href="/manager"
            className="rounded-full border border-ink/20 px-5 py-3 font-medium text-ink-soft hover:border-ink"
          >
            Manager portal
          </Link>
        </div>

        <p className="text-sm text-muted">
          Operators approve new listings from the platform console. Clients join once with email
          and can switch between businesses they belong to.
        </p>
      </div>

      <footer className="mt-auto border-t border-ink/10 bg-[#0b0b0b] px-6 py-10">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <BeautyZentLogo variant="dark" size="md" href={null} />
          <div>
            <p className="font-[family-name:var(--font-display)] text-lg text-[#e8c9a0]">
              {BEAUTYZENT.name}
            </p>
            <p className="mt-1 text-xs font-semibold tracking-[0.16em] text-[#c4a574]/80 uppercase">
              {BEAUTYZENT.tagline}
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
