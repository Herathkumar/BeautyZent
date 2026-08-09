import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { AppOpenSplash } from "@/components/AppOpenSplash";
import { canAccessStylistPortal, getSession } from "@/lib/auth";
import { StylistBottomNav } from "./StylistBottomNav";
import { StylistThemeRoot } from "./StylistThemeRoot";

export const metadata: Metadata = {
  title: "FHSalon — Stylist App",
  description: "Today's bookings, check-in, and time off — phone-friendly stylist portal.",
  manifest: "/stylist-manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "FHSalon Stylist",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/stylist-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/stylist-icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/stylist-icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/stylist-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0e1618",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function StylistLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  // Trust JWT for chrome — avoids a Prisma round-trip on every navigation.
  // Deactivated accounts still fail on API calls and login.
  const showStylistChrome = canAccessStylistPortal(session);

  return (
    <StylistThemeRoot showChrome={showStylistChrome}>
      <AppOpenSplash variant="stylist" />
      {showStylistChrome ? (
        <header className="admin-header shrink-0 z-20 px-4 py-3">
          <div className="mx-auto flex max-w-lg items-center justify-between">
            <Link
              href="/stylist"
              className="font-[family-name:var(--font-display)] text-lg tracking-wide text-champagne"
            >
              FHSalon
            </Link>
            <p className="text-xs text-muted">Stylist App · no install</p>
          </div>
        </header>
      ) : null}
      <div
        className={`stylist-app-main mx-auto w-full max-w-lg px-4 ${
          showStylistChrome ? "pt-4 pb-6" : "py-8"
        }`}
      >
        {children}
      </div>
      {showStylistChrome ? <StylistBottomNav /> : null}
    </StylistThemeRoot>
  );
}
