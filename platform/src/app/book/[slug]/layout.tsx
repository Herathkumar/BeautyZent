import type { Metadata, Viewport } from "next";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: "FHSalon — Online Booking",
    description: "Book a salon visit online — pick a service, stylist, and time.",
    manifest: `/book/${slug}/manifest`,
    appleWebApp: {
      capable: true,
      title: "FHSalon Booking",
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
  themeColor: "#1a1418",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function BookLayout({ children }: Props) {
  return children;
}
