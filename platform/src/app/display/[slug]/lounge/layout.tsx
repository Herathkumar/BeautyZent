import type { Metadata, Viewport } from "next";
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
    title: `${name} — Lounge`,
    description: "Customer lounge waiting-room display.",
    manifest: `/display/${slug}/lounge/manifest`,
    appleWebApp: {
      capable: true,
      title: `${name} Lounge`,
      statusBarStyle: "default",
    },
    icons: {
      icon: [{ url: "/lounge-icon.svg", type: "image/svg+xml" }],
      apple: [{ url: "/lounge-icon.svg" }],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#fafafa",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function LoungeDisplayLayout({ children }: Props) {
  return children;
}
