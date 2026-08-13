import type { Metadata, Viewport } from "next";
import { getPlatformSession } from "@/lib/platform-auth";
import { PlatformShell } from "./PlatformShell";

export const metadata: Metadata = {
  title: "SalonBook — Platform operator",
  description: "Create and configure salons on the SalonBook platform.",
};

export const viewport: Viewport = {
  themeColor: "#f3eee8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await getPlatformSession();
  const admin = session ? { name: session.name, email: session.email } : null;
  return <PlatformShell admin={admin}>{children}</PlatformShell>;
}
