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
    name,
    short_name: name,
    description:
      "Book your salon visit, manage appointments, and keep a photo look book of every visit.",
    start_url: `/book/${slug}`,
    scope: `/book/${slug}`,
    display: "standalone",
    orientation: "any",
    background_color: "#0a1630",
    theme_color: "#0c0b0a",
    icons: [
      {
        src: "/book-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/book-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
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
