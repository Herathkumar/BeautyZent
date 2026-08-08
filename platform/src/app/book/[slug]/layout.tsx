import type { Metadata, Viewport } from "next";
import { AppOpenSplash } from "@/components/AppOpenSplash";
import { BookThemeBoot } from "./BookThemeToggle";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: "FHS Client",
    description:
      "Book your salon visit, manage appointments, and keep a photo look book of every visit.",
    manifest: `/book/${slug}/manifest`,
    appleWebApp: {
      capable: true,
      title: "FHS Client",
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

export default function BookLayout({ children }: Props) {
  return (
    <BookThemeBoot>
      <AppOpenSplash variant="book" />
      {children}
    </BookThemeBoot>
  );
}
