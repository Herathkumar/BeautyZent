import type { Metadata, Viewport } from "next";
import { AppOpenSplash } from "@/components/AppOpenSplash";
import { SalonThemeSync } from "@/components/SalonThemeSync";
import { prisma } from "@/lib/prisma";
import { DEFAULT_BOOKING_THEME_ID, normalizeThemeId } from "@/lib/salon-themes";
import { BookThemeBoot } from "./BookThemeToggle";

export const dynamic = "force-dynamic";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { name: true, active: true },
  });
  const title = salon?.active && salon.name ? salon.name : "Salon Booking";
  return {
    title,
    description:
      "Book your salon visit, manage appointments, and keep a photo look book of every visit.",
    manifest: `/book/${slug}/manifest`,
    appleWebApp: {
      capable: true,
      title,
      statusBarStyle: "black-translucent",
    },
    icons: {
      icon: [
        { url: "/book-icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/book-icon-512.png", sizes: "512x512", type: "image/png" },
        { url: "/book-icon.svg", type: "image/svg+xml" },
      ],
      apple: [{ url: "/book-icon-180.png", sizes: "180x180", type: "image/png" }],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#17121f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function BookLayout({ children, params }: Props) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: {
      name: true,
      brandColor: true,
      accentColor: true,
      bookingThemeId: true,
      managerThemeId: true,
      stylistThemeId: true,
      active: true,
    },
  });
  const brand = salon?.active ? salon : null;
  const themeId = normalizeThemeId(brand?.bookingThemeId, DEFAULT_BOOKING_THEME_ID);

  return (
    <BookThemeBoot>
      {/* Runs before paint so a first-time visitor still sees the salon's pack. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.setAttribute("data-salon-theme","${themeId}")`,
        }}
      />
      <SalonThemeSync
        themeId={themeId}
        fallbackThemeId={DEFAULT_BOOKING_THEME_ID}
        slug={slug}
        themeField="bookingThemeId"
        brand={
          brand
            ? {
                slug,
                name: brand.name,
                brandColor: brand.brandColor,
                accentColor: brand.accentColor,
                bookingThemeId: brand.bookingThemeId,
                managerThemeId: brand.managerThemeId,
                stylistThemeId: brand.stylistThemeId,
              }
            : null
        }
      />
      <AppOpenSplash
        variant="book"
        slug={slug}
        brandName={brand?.name}
        brandColor={brand?.brandColor}
        accentColor={brand?.accentColor}
        themeIds={brand}
      />
      {children}
    </BookThemeBoot>
  );
}
