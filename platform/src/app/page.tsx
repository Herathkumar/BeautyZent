import Link from "next/link";

export default function HomePage() {
  const slug = process.env.NEXT_PUBLIC_DEFAULT_SALON_SLUG || "fhsalon";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div>
        <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-cocoa uppercase">
          BeautyZent
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-5xl leading-none tracking-tight text-ink">
          Book beauty & personal care near you
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          Marketplace for salons, barbers, spas, and similar businesses — online booking,
          memberships, and shop tools in one platform.
        </p>
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
    </main>
  );
}
