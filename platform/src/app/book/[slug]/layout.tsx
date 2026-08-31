import type { Metadata, Viewport } from "next";
import { AppOpenSplash } from "@/components/AppOpenSplash";
import { SalonThemeSync } from "@/components/SalonThemeSync";
import { MARKETPLACE_BOOK_THEME_ID } from "@/lib/marketplace-book-theme";
import { prisma } from "@/lib/prisma";
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
  themeColor: "#0c0b0a",
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
  const themeId = MARKETPLACE_BOOK_THEME_ID;

  return (
    <BookThemeBoot>
      {/* Before paint: client app is always cocoa gold luxury, never a salon pack or light mode. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var r=document.documentElement;if(/[?&]from=explore(?:&|$)/.test(location.search)){try{sessionStorage.setItem("fhsalon-book-from-market","1");}catch(e){}}r.setAttribute("data-salon-theme","${themeId}");r.classList.add("book-shell","book-shell--marketplace");r.classList.remove("book-shell--light","theme-light");try{localStorage.setItem("fhsalon-book-luxe-v3","1");localStorage.setItem("fhsalon-book-theme","dark");}catch(e){}}catch(e){document.documentElement.setAttribute("data-salon-theme","${themeId}");}})();`,
        }}
      />
      <SalonThemeSync
        themeId={themeId}
        fallbackThemeId={MARKETPLACE_BOOK_THEME_ID}
        slug={slug}
        themeField="bookingThemeId"
        brand={
          brand
            ? {
                slug,
                name: brand.name,
                brandColor: brand.brandColor,
                accentColor: brand.accentColor,
                bookingThemeId: MARKETPLACE_BOOK_THEME_ID,
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
