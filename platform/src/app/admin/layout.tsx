import Link from "next/link";
import { getSession } from "@/lib/auth";
import { LogoutButton } from "./LogoutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <div className="admin-theme">
      <header className="admin-header sticky top-0 z-20">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-[#c9a87c] uppercase">
              Salon control
            </p>
            <Link
              href="/admin"
              className="font-[family-name:var(--font-display)] text-2xl text-[#fffaf6]"
            >
              Salon admin
            </Link>
          </div>
          {session ? (
            <nav className="admin-nav flex flex-wrap items-center gap-4 text-sm">
              <Link href="/admin">Overview</Link>
              <Link href="/admin/appointments">Bookings</Link>
              <Link href="/admin/book">Book for client</Link>
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
