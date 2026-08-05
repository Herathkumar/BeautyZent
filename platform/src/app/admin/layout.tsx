import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { AppOpenSplash } from "@/components/AppOpenSplash";
import { getSession, isSalonStaff } from "@/lib/auth";
import { AdminBottomNav } from "./AdminBottomNav";
import { AdminHeaderNav } from "./AdminHeaderNav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "FHSalon — Manager App",
  description: "Dashboard, bookings, earnings, and team — phone-friendly manager portal.",
  manifest: "/manager-manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "FHSalon Manager",
    statusBarStyle: "black-translucent",
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
  themeColor: "#1c1714",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const showChrome = isSalonStaff(session?.role);

  return (
    <div className={showChrome ? "admin-theme admin-app-shell" : "admin-theme min-h-screen"}>
      <AppOpenSplash variant="manager" />
      {showChrome ? (
        <header className="admin-header shrink-0 z-20">
          {/* Mobile — same chrome pattern as Stylist App */}
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:hidden">
            <Link
              href="/manager"
              className="font-[family-name:var(--font-display)] text-lg tracking-wide text-champagne"
            >
              FHSalon
            </Link>
            <p className="text-xs text-muted">Manager App · no install</p>
          </div>
          {/* Desktop */}
          <div className="mx-auto hidden max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4 md:flex">
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
        className={`admin-app-main mx-auto w-full max-w-5xl px-4 ${
          showChrome ? "pt-4 pb-6 md:px-6 md:py-8" : "py-8 md:px-6"
        }`}
      >
        {children}
      </div>
      {showChrome ? <AdminBottomNav /> : null}
    </div>
  );
}
