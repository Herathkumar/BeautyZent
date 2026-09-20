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
    title: `${name} — Scheduler`,
    description: "Customer day schedule display.",
    manifest: `/display/${slug}/scheduler/manifest`,
    appleWebApp: {
      capable: true,
      title: `${name} Scheduler`,
      statusBarStyle: "default",
    },
    icons: {
      icon: [{ url: "/scheduler-icon.svg", type: "image/svg+xml" }],
      apple: [{ url: "/scheduler-icon.svg" }],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#fafafa",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function SchedulerDisplayLayout({ children }: Props) {
  return children;
}
