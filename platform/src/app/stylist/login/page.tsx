import Link from "next/link";
import { redirect } from "next/navigation";
import { ZentraLabFooter } from "@/components/ZentraLabFooter";
import { getStylistSession } from "@/lib/auth";
import { salonLoginContext } from "@/lib/salon-login";
import { StylistLoginForm } from "./StylistLoginForm";

export default async function StylistLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ salon?: string }>;
}) {
  const { salon: slug } = await searchParams;
  const salon = await salonLoginContext(slug);
  const stylistSession = await getStylistSession();
  if (stylistSession && (!salon || stylistSession.salonId === salon.id)) {
    redirect("/stylist");
  }

  const accounts = (salon?.users || [])
    .filter((user) => user.role === "STYLIST" || user.stylistId)
    .map((user) => ({ email: user.email, name: user.name }));

  return (
    <main className="mx-auto max-w-md space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-champagne">Stylist App</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">
          {salon?.name || "Stylist App"}
        </h1>
        <p className="mt-2 text-muted">
          {salon
            ? `Sign in to ${salon.name} — today's clients, walk-ins, and time off.`
            : "See today's clients, tap when they arrive, call them, and mark days off — no app store install."}
        </p>
      </div>

      <StylistLoginForm
        salonSlug={salon?.slug}
        salonName={salon?.name}
        accounts={accounts}
      />

      <div className="rounded-2xl border border-ink/15 bg-cream px-4 py-4 text-sm text-muted">
        <p className="font-semibold text-champagne">Put it on your home screen</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Open this page in Safari (iPhone) or Chrome (Android)</li>
          <li>Tap Share / menu</li>
          <li>
            Choose <span className="text-ink-soft">Add to Home Screen</span>
          </li>
        </ol>
        <p className="mt-3 text-xs">
          Saves as <span className="text-ink-soft">Stylist App</span> with the teal stylist icon.
          Your salon manager creates your login — change the password under Profile after first
          sign-in.
        </p>
      </div>

      <p className="text-sm text-muted">
        Salon manager?{" "}
        <Link
          href={salon ? `/manager/login?salon=${encodeURIComponent(salon.slug)}` : "/manager/login"}
          className="text-champagne"
        >
          Manager App
        </Link>
      </p>

      <ZentraLabFooter compact />
    </main>
  );
}
