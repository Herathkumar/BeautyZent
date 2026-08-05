import type { Metadata, Viewport } from "next";
import { AppOpenSplash } from "@/components/AppOpenSplash";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: "FHSalon — Store Display",
    description: "Salon floor tablet — who's waiting, check-in, and walk-ins.",
    manifest: `/display/${slug}/manifest`,
    appleWebApp: {
      capable: true,
      title: "FHSalon Display",
      statusBarStyle: "black-translucent",
    },
    icons: {
      icon: [
        { url: "/display-icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/display-icon-512.png", sizes: "512x512", type: "image/png" },
        { url: "/display-icon.svg", type: "image/svg+xml" },
      ],
      apple: [{ url: "/display-icon-180.png", sizes: "180x180", type: "image/png" }],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#1c1714",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function DisplayLayout({ children }: Props) {
  return (
    <>
      <AppOpenSplash variant="display" />
      {children}
    </>
  );
}
