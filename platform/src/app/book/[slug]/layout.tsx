import type { Metadata, Viewport } from "next";
import { AppOpenSplash } from "@/components/AppOpenSplash";
import { SalonThemeSync } from "@/components/SalonThemeSync";
import { MARKETPLACE_BOOK_THEME_ID } from "@/lib/marketplace-book-theme";
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
  const title = salon?.active && salon.name ? salon.name : "Book online";
  return {
    title,
    description:
      "Book your visit, manage appointments, and keep a photo look book of every visit.",
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
    formatDetection: {
      telephone: false,
      date: false,
      email: false,
      address: false,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#f3ebe3",
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
  const marketTheme = MARKETPLACE_BOOK_THEME_ID;

  return (
    <BookThemeBoot>
      {/* Before paint: Explore arrivals use cocoa, never the salon booking pack. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var r=document.documentElement;var m=/[?&]from=explore(?:&|$)/.test(location.search)||sessionStorage.getItem("fhsalon-book-from-market")==="1";if(/[?&]from=explore(?:&|$)/.test(location.search)){try{sessionStorage.setItem("fhsalon-book-from-market","1");}catch(e){}}if(m){r.setAttribute("data-salon-theme","${marketTheme}");r.classList.add("book-shell","book-shell--light","theme-light","book-shell--marketplace");try{localStorage.setItem("fhsalon-book-theme","light");}catch(e){}}else{r.setAttribute("data-salon-theme","${themeId}");}}catch(e){document.documentElement.setAttribute("data-salon-theme","${themeId}");}})();`,
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
