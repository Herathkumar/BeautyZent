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
  const start = `/display/${slug}/scheduler`;
  const manifest = {
    name: `${name} — Scheduler`,
    short_name: `${name} Scheduler`,
    description: "Salon day schedule TV.",
    id: start,
    start_url: `/shells/display.html?next=${encodeURIComponent(start)}`,
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "browser"],
    orientation: "any",
    background_color: "#10141a",
    theme_color: "#10141a",
    icons: [
      {
        src: "/scheduler-icon.svg",
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
