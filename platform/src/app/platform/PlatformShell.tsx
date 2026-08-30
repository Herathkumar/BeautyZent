"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BeautyZentLogo } from "@/components/BeautyZentBrand";

export function PlatformShell({
  admin,
  children,
}: {
  admin: { name: string; email: string } | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const onLogin = pathname === "/platform/login";

  async function signOut() {
    await fetch("/api/platform/auth/logout", { method: "POST" });
    router.push("/platform/login");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-16 pt-6 sm:px-6">
      {!onLogin ? (
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link href={admin ? "/platform" : "/platform/login"} className="flex items-center gap-3">
            <BeautyZentLogo
              variant="rose"
              size="md"
              href={null}
              priority
              className="!h-11 !w-auto max-w-[2.75rem] shrink-0 object-left object-contain"
            />
            <span className="grid gap-0.5">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-cocoa">
                BeautyZent Marketplace
              </span>
              <span className="font-[family-name:var(--font-display)] text-2xl leading-none text-ink">
                Operator console
              </span>
            </span>
          </Link>

          {admin ? (
            <div className="flex items-center gap-2 text-sm">
              <Link
                href="/explore"
                className="rounded-full border border-ink/12 px-3 py-2 text-muted hover:border-ink/30"
              >
                Explore
              </Link>
              <span className="hidden text-muted sm:inline">{admin.email}</span>
              <button
                type="button"
                onClick={signOut}
                className="rounded-full border border-ink/20 px-4 py-2 font-medium text-ink-soft hover:border-ink"
              >
                Sign out
              </button>
            </div>
          ) : null}
        </header>
      ) : null}

      <main className={`flex-1 ${onLogin ? "" : "mt-6"}`}>{children}</main>
    </div>
  );
}
