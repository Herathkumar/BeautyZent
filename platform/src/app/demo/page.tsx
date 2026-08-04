import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SalonBook demo hub",
  description: "One-click demo of website, booking, floor display, stylist portal, and admin.",
};

const slug = process.env.NEXT_PUBLIC_DEFAULT_SALON_SLUG || "fhsalon";
const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_URL || "https://www.fhsalon.ca";

const demos = [
  {
    step: "1",
    href: marketingUrl,
    external: true,
    title: "Website",
    subtitle: "Marketing site — client starting point",
    hint: "Click Book online (or open booking next)",
    accent: "from-[#3d2b22] to-[#2a211c]",
  },
  {
    step: "2",
    href: `/book/${slug}`,
    external: false,
    title: "Book online",
    subtitle: "Client reservation — no app install",
    hint: "Service → stylist → time → confirm",
    accent: "from-[#6e4a52] to-[#2a2126]",
  },
  {
    step: "3",
    href: `/display/${slug}`,
    external: false,
    title: "Floor display",
    subtitle: "Salon tablet — who’s waiting",
    hint: "Show the new booking · Check in",
    accent: "from-[#2a3f3a] to-[#1c1714]",
  },
  {
    step: "4",
    href: "/stylist/login",
    external: false,
    title: "Stylist portal",
    subtitle: "Phone app — My Day",
    hint: "Use the login your admin created",
    accent: "from-[#3a2f4a] to-[#1c1714]",
  },
  {
    step: "5",
    href: "/admin/login",
    external: false,
    title: "Admin",
    subtitle: "Front desk — services & walk-ins",
    hint: "Salon manager account",
    accent: "from-[#4a3520] to-[#1c1714]",
  },
] as const;

export default function DemoHubPage() {
  return (
    <main className="book-theme min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8 space-y-3 text-center sm:text-left">
          <p className="text-xs font-semibold tracking-[0.22em] text-[#f2c4b0] uppercase">
            Sales demo · record in order
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl leading-none sm:text-5xl">
            SalonBook demo hub
          </h1>
          <p className="max-w-xl text-muted">
            Open each surface in order while you screen-record. Same system a salon gets: website,
            online booking, floor tablet, stylist phone, and admin.
          </p>
        </div>

        <ol className="grid gap-3">
          {demos.map((d) => {
            const className = `group relative flex min-h-[5.5rem] items-center gap-4 rounded-2xl border border-[rgba(232,180,162,0.3)] bg-gradient-to-r ${d.accent} px-4 py-4 shadow-[0_12px_40px_rgba(0,0,0,0.25)] transition hover:border-[rgba(242,196,176,0.55)] hover:scale-[1.01] sm:px-5`;
            const body = (
              <>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[rgba(242,196,176,0.18)] font-[family-name:var(--font-display)] text-2xl text-[#f2c4b0]">
                  {d.step}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-xl font-semibold text-[#fffaf6]">{d.title}</span>
                  <span className="mt-0.5 block text-sm text-[#c4b0a2]">{d.subtitle}</span>
                  <span className="mt-1 block text-xs text-[#f2c4b0]/90">{d.hint}</span>
                </span>
                <span className="shrink-0 text-2xl text-[#f2c4b0]/70 transition group-hover:translate-x-0.5 group-hover:text-[#f2c4b0]">
                  →
                </span>
              </>
            );

            if (d.external) {
              return (
                <li key={d.step}>
                  <a href={d.href} target="_blank" rel="noopener noreferrer" className={className}>
                    {body}
                  </a>
                </li>
              );
            }

            return (
              <li key={d.step}>
                <Link href={d.href} className={className}>
                  {body}
                </Link>
              </li>
            );
          })}
        </ol>

        <div className="mt-8 rounded-2xl border border-[rgba(232,180,162,0.25)] bg-[rgba(42,33,38,0.9)] p-5 text-sm text-muted">
          <p className="font-semibold text-[#f2c4b0]">Recording tip</p>
          <p className="mt-2">
            Start Loom/OBS on this page → open each step → keep this tab for the next surface.
            For a local marketing site instead of live fhsalon.ca, set{" "}
            <code className="text-[#f2c4b0]">NEXT_PUBLIC_MARKETING_URL</code> (e.g.{" "}
            <code className="text-[#f2c4b0]">http://localhost:5500</code>).
          </p>
          <p className="mt-3 text-xs">
            Production logins are created in Admin (no shared demo password on live).
          </p>
        </div>

        <p className="mt-6 text-center text-sm">
          <Link href="/" className="text-[#f2c4b0] hover:underline">
            ← Platform home
          </Link>
        </p>
      </div>
    </main>
  );
}
