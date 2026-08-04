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
      <header className="admin-header sticky top-0 z-20">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-[#c9a87c] uppercase">
              Salon manager
            </p>
            <Link
              href={showChrome ? "/manager" : "/manager/login"}
              className="font-[family-name:var(--font-display)] text-2xl text-[#fffaf6]"
            >
              Salon manager
            </Link>
          </div>
          {showChrome ? <AdminHeaderNav /> : null}
        </div>
      </header>
      <div
        className={`mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8 ${showChrome ? "pb-28 md:pb-8" : ""}`}
      >
        {children}
      </div>
      {showChrome ? <AdminBottomNav /> : null}
    </div>
  );
}
