import Link from "next/link";
import { getSession, isSalonStaff } from "@/lib/auth";
import { AdminBottomNav } from "./AdminBottomNav";
import { AdminHeaderNav } from "./AdminHeaderNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const showChrome = isSalonStaff(session?.role);

  return (
    <div className="admin-theme min-h-screen">
      {showChrome ? (
        <header className="admin-header sticky top-0 z-20">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] text-[#c9a87c] uppercase">
                Manager App
              </p>
              <Link
                href="/manager"
                className="font-[family-name:var(--font-display)] text-2xl text-[#fffaf6]"
              >
                FHSalon
              </Link>
            </div>
            <AdminHeaderNav />
          </div>
        </header>
      ) : null}
      <div
        className={`mx-auto max-w-5xl px-4 ${
          showChrome ? "py-6 pb-28 md:px-6 md:py-8 md:pb-8" : "py-8 md:px-6"
        }`}
      >
        {children}
      </div>
      {showChrome ? <AdminBottomNav /> : null}
    </div>
  );
}
