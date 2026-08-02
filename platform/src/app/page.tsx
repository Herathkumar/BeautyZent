import Link from "next/link";

export default function HomePage() {
  const slug = process.env.NEXT_PUBLIC_DEFAULT_SALON_SLUG || "fhsalon";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div>
        <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-cocoa uppercase">
          SalonBook platform
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-5xl leading-none tracking-tight text-ink">
          Online booking for salons
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          Pilot for Farzana Hair Salon — stylist booking, Google Calendar phone sync, tablet
          floor display, and admin for services & products. Multi-tenant ready for other salons.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/book/${slug}`}
          className="rounded-full bg-ink px-5 py-3 font-medium text-cream hover:bg-cocoa"
        >
          Book appointment
        </Link>
        <Link
          href={`/display/${slug}`}
          className="rounded-full border border-ink px-5 py-3 font-medium hover:bg-ink hover:text-cream"
        >
          Salon tablet display
        </Link>
        <Link
          href="/admin"
          className="rounded-full border border-ink/20 px-5 py-3 font-medium text-ink-soft hover:border-ink"
        >
          Admin portal
        </Link>
      </div>

      <p className="text-sm text-muted">
        Live marketing site stays on Netlify <code>main</code>. This app runs on the{" "}
        <code>feature/online-booking</code> branch until you promote it.
      </p>
    </main>
  );
}
