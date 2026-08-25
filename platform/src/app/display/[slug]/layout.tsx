import type { Metadata, Viewport } from "next";
import { AppOpenSplash } from "@/components/AppOpenSplash";
import { prisma } from "@/lib/prisma";

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
  const name = salon?.active && salon.name ? salon.name : "Salon";
  return {
    title: `${name} — Store Display`,
    description: "Customer waiting-room board and reception check-in display.",
    manifest: `/display/${slug}/manifest`,
    appleWebApp: {
      capable: true,
      title: `${name} Display`,
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

export default async function DisplayLayout({ children, params }: Props) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { name: true, brandColor: true, accentColor: true, active: true },
  });
  const brand = salon?.active ? salon : null;

  return (
    <>
      <AppOpenSplash
        variant="display"
        slug={slug}
        brandName={brand?.name}
        brandColor={brand?.brandColor}
        accentColor={brand?.accentColor}
      />
      {children}
    </>
  );
}
