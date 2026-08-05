import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const manifest = {
    name: "FHSalon — Store Display",
    short_name: "FHSalon Display",
    description: "Salon floor tablet — who's waiting, check-in, and walk-ins.",
    start_url: `/display/${slug}`,
    scope: `/display/${slug}`,
    display: "standalone",
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
