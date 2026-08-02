import Link from "next/link";
import { getSession } from "@/lib/auth";
import { LogoutButton } from "./LogoutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink/10 bg-cream/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Link href="/admin" className="font-[family-name:var(--font-display)] text-xl">
            Salon admin
          </Link>
          {session ? (
            <nav className="flex flex-wrap items-center gap-4 text-sm text-ink-soft">
              <Link href="/admin">Overview</Link>
              <Link href="/admin/appointments">Bookings</Link>
              <Link href="/admin/services">Services</Link>
              <Link href="/admin/products">Products</Link>
              <Link href="/admin/stylists">Stylists</Link>
              <LogoutButton />
            </nav>
          ) : null}
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
    </div>
  );
}
