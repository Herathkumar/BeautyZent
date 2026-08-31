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
    title: `${name} — Reception`,
    description: "Front desk — bookings, check-in, walk-ins, and checkout.",
    appleWebApp: {
      capable: true,
      title: `${name} Reception`,
      statusBarStyle: "black-translucent",
    },
    icons: {
      icon: [{ url: "/reception-icon.svg", type: "image/svg+xml" }],
      apple: [{ url: "/reception-icon.svg" }],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#15101f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function ReceptionLayout({ children }: Props) {
  return children;
}
