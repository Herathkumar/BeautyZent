import type { Metadata, Viewport } from "next";
import { AppOpenSplash } from "@/components/AppOpenSplash";
import { StylistAppShell } from "./StylistAppShell";

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
  interactiveWidget: "resizes-content",
};

/** Sync layout — no auth/DB await so the shell can stream immediately. */
export default function StylistLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppOpenSplash variant="stylist" />
      <StylistAppShell>{children}</StylistAppShell>
    </>
  );
}
