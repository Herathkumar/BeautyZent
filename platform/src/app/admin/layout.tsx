import type { Metadata, Viewport } from "next";
import { ManagerAppShell } from "./ManagerAppShell";
import { SalonThemeSync } from "@/components/SalonThemeSync";
import { SalonBrandMark } from "@/components/SalonBrandMark";
import { getSession, isSalonStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { locationEyebrow, toClientSalonBrand } from "@/lib/salon-branding";
import { DEFAULT_MANAGER_THEME_ID, normalizeThemeId } from "@/lib/salon-themes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Salon Manager",
  description: "Dashboard, bookings, earnings, and team for your salon.",
  manifest: "/manager-manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Salon Manager",
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

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  let themeId = DEFAULT_MANAGER_THEME_ID;
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

  if (session && isSalonStaff(session.role)) {
    brand = toClientSalonBrand(
      await prisma.salon.findUnique({
        where: { id: session.salonId },
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
      })
    );
    themeId = normalizeThemeId(brand?.managerThemeId, DEFAULT_MANAGER_THEME_ID);
  }

  const brandName = brand?.name?.trim() || "Salon";
  const location = locationEyebrow(brand?.address);

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.setAttribute("data-salon-theme","${themeId}")`,
        }}
      />
      <SalonThemeSync
        themeId={themeId}
        fallbackThemeId={DEFAULT_MANAGER_THEME_ID}
        themeField="managerThemeId"
        slug={brand?.slug}
        brand={brand}
        staff
      />
      <ManagerAppShell
        initialBrand={brand}
        brandLink={
          <a
            href="/manager"
            className="font-[family-name:var(--font-display)] text-lg tracking-wide text-ink"
          >
            <SalonBrandMark name={brandName} />
          </a>
        }
        brandLinkDesktop={
          <div>
            {location ? (
              <p className="text-[11px] font-semibold tracking-[0.2em] text-champagne uppercase">
                {location}
              </p>
            ) : null}
            <a
              href="/manager"
              className="font-[family-name:var(--font-display)] text-2xl text-ink"
            >
              <SalonBrandMark name={brandName} />
            </a>
          </div>
        }
      >
        {children}
      </ManagerAppShell>
    </>
  );
}
