import type { Metadata, Viewport } from "next";
import { StylistAppShell } from "./StylistAppShell";
import { SalonThemeSync } from "@/components/SalonThemeSync";
import { getStylistSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_STYLIST_THEME_ID, normalizeThemeId } from "@/lib/salon-themes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stylist App",
  description: "Today's bookings, check-in, and time off — phone-friendly stylist portal.",
  manifest: "/stylist-manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Stylist App",
    statusBarStyle: "default",
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
  interactiveWidget: "overlays-content",
};

export default async function StylistLayout({ children }: { children: React.ReactNode }) {
  const session = await getStylistSession();
  let themeId = DEFAULT_STYLIST_THEME_ID;
  let brand: {
    name: string;
    slug: string;
    address?: string | null;
    brandColor: string | null;
    accentColor: string | null;
    bookingThemeId: string | null;
    managerThemeId: string | null;
    stylistThemeId: string | null;
  } | null = null;

  if (session?.stylistId) {
    const stylist = await prisma.stylist.findUnique({
      where: { id: session.stylistId },
      select: {
        salon: {
          select: {
            name: true,
            slug: true,
            address: true,
            brandColor: true,
            accentColor: true,
            bookingThemeId: true,
            managerThemeId: true,
            stylistThemeId: true,
          },
        },
      },
    });
    brand = stylist?.salon ?? null;
    themeId = normalizeThemeId(brand?.stylistThemeId, DEFAULT_STYLIST_THEME_ID);
  }

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.setAttribute("data-salon-theme","${themeId}")`,
        }}
      />
      <SalonThemeSync
        themeId={themeId}
        fallbackThemeId={DEFAULT_STYLIST_THEME_ID}
        themeField="stylistThemeId"
        slug={brand?.slug}
        brand={brand}
        staff
      />
      <StylistAppShell initialBrand={brand}>{children}</StylistAppShell>
    </>
  );
}
