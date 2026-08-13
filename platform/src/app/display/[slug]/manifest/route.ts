import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { humanizeSlug } from "@/lib/salon-branding";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { name: true, active: true },
  });
  const name = salon?.active && salon.name ? salon.name : humanizeSlug(slug);
  const manifest = {
    name: `${name} — Store Display`,
    short_name: `${name} Display`,
    description: "Salon floor tablet — who's waiting, check-in, and walk-ins.",
    id: `/display/${slug}`,
    start_url: `/shells/display.html?next=${encodeURIComponent(`/display/${slug}`)}`,
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "browser"],
    orientation: "any",
    background_color: "#1c1714",
    theme_color: "#1c1714",
    icons: [
      {
        src: "/display-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/display-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/display-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
