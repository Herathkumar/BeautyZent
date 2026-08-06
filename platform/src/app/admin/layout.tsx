import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { AppOpenSplash } from "@/components/AppOpenSplash";
import { getSession, isSalonStaff } from "@/lib/auth";
import { AdminBottomNav } from "./AdminBottomNav";
import { AdminHeaderNav } from "./AdminHeaderNav";
import { ManagerThemeRoot } from "./ManagerThemeRoot";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "FHSalon — Manager",
  description: "Dashboard, bookings, earnings, and team for Farzana Hair Salon.",
  manifest: "/manager-manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "FHSalon Manager",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/manager-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/manager-icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/manager-icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/manager-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#fdf8f3",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const showChrome = isSalonStaff(session?.role);

  return (
    <ManagerThemeRoot showChrome={Boolean(showChrome)}>
      <AppOpenSplash variant="manager" />
      {showChrome ? (
        <header className="admin-header shrink-0 z-20">
          {/* Mobile — same chrome pattern as Stylist App */}
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:hidden">
            <Link
              href="/manager"
              className="font-[family-name:var(--font-display)] text-lg tracking-wide text-ink"
            >
              Farzana <span className="text-champagne">Hair Salon</span>
            </Link>
            <p className="text-xs font-semibold tracking-[0.16em] text-champagne uppercase">
              Manager
            </p>
          </div>
          {/* Desktop */}
          <div className="mx-auto hidden max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4 md:flex">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] text-champagne uppercase">
                Dundas, Ontario
              </p>
              <Link
                href="/manager"
                className="font-[family-name:var(--font-display)] text-2xl text-ink"
              >
                Farzana <span className="text-champagne">Hair Salon</span>
              </Link>
            </div>
            <AdminHeaderNav />
          </div>
        </header>
      ) : null}
      <div
        className={`admin-app-main mx-auto w-full max-w-5xl px-4 ${
          showChrome ? "pt-4 pb-6 md:px-6 md:py-8" : "py-8 md:px-6"
        }`}
      >
        {children}
      </div>
      {showChrome ? <AdminBottomNav /> : null}
    </ManagerThemeRoot>
  );
}
