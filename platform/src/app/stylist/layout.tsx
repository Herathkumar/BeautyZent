import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { StylistBottomNav } from "./StylistBottomNav";

export const metadata: Metadata = {
  title: "FHSalon — Stylist App",
  description: "Today's bookings, check-in, and time off — phone-friendly stylist portal.",
  manifest: "/stylist-manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "FHSalon",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/stylist-icon.svg",
    apple: "/stylist-icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#1c1714",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function StylistLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const isStylist = session?.role === "STYLIST";

  return (
    <div className="stylist-theme min-h-screen">
      {isStylist ? (
        <header className="admin-header sticky top-0 z-20 px-4 py-3">
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
      <div className={`mx-auto max-w-lg px-4 ${isStylist ? "pb-28 pt-4" : "py-8"}`}>
        {children}
      </div>
      {isStylist ? <StylistBottomNav /> : null}
    </div>
  );
}
