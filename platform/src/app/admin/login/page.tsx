import Link from "next/link";
import { redirect } from "next/navigation";
import { ZentraLabFooter } from "@/components/ZentraLabFooter";
import { getSession, isSalonStaff } from "@/lib/auth";
import { salonLoginContext } from "@/lib/salon-login";
import { ManagerLoginForm } from "./ManagerLoginForm";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ salon?: string }>;
}) {
  const { salon: slug } = await searchParams;
  const salon = await salonLoginContext(slug);
  const session = await getSession();
  if (session && isSalonStaff(session.role) && (!salon || session.salonId === salon.id)) {
    redirect("/manager");
  }

  const accounts = (salon?.users || [])
    .filter((user) => user.role === "ADMIN" || user.role === "MANAGER" || user.role === "FRONT_DESK")
    .map((user) => ({ email: user.email, name: user.name }));

  return (
    <main className="mx-auto max-w-md space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-champagne">Manager</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-ink">
          {salon ? (
            <>
              {salon.name} <span className="text-champagne">Manager</span>
            </>
          ) : (
            <>
              Salon <span className="text-champagne">Manager</span>
            </>
          )}
        </h1>
        <p className="mt-2 text-muted">
          {salon
            ? `Sign in with a ${salon.name} manager account.`
            : "Sign in with the salon manager account to manage services, stylists, and bookings."}
        </p>
      </div>

      <ManagerLoginForm
        salonSlug={salon?.slug}
        salonName={salon?.name}
        accounts={accounts}
      />

      <div className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-4 text-sm text-muted">
        <p className="font-semibold text-champagne">Put it on your home screen</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Open this page in Safari (iPhone) or Chrome (Android)</li>
          <li>Tap Share / menu</li>
          <li>
            Choose <span className="text-ink">Add to Home Screen</span>
          </li>
        </ol>
        <p className="mt-3 text-xs">
          Saves as <span className="text-ink">Salon Manager</span> with the gold salon icon.
          Use the salon manager account — change the password under Profile after first sign-in.
        </p>
      </div>

      <p className="text-sm text-muted">
        Stylist?{" "}
        <Link
          href={salon ? `/stylist/login?salon=${encodeURIComponent(salon.slug)}` : "/stylist/login"}
          className="text-champagne"
        >
          Stylist App
        </Link>
      </p>

      <ZentraLabFooter compact />
    </main>
  );
}
