import type { Metadata, Viewport } from "next";
import "./explore-luxe.css";

export const metadata: Metadata = {
  title: {
    default: "Explore businesses — BeautyZent",
    template: "%s — BeautyZent",
  },
  description: "Find salons, barbers, spas, and book online on BeautyZent.",
  applicationName: "BeautyZent",
  manifest: "/explore/manifest",
  appleWebApp: {
    capable: true,
    title: "BeautyZent",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/explore-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/explore-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/explore-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a1a3a",
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
