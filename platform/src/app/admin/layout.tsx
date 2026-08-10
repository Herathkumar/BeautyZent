import type { Metadata, Viewport } from "next";
import { AppOpenSplash } from "@/components/AppOpenSplash";
import { ManagerAppShell } from "./ManagerAppShell";

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
  themeColor: "#f3ebe3",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  interactiveWidget: "overlays-content",
};

/** Sync layout — no auth/DB await so the shell can stream immediately. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppOpenSplash variant="manager" />
      <ManagerAppShell>{children}</ManagerAppShell>
    </>
  );
}
