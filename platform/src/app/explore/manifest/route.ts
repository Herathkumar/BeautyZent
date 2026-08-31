import { NextResponse } from "next/server";

export async function GET() {
  const manifest = {
    name: "BeautyZent",
    short_name: "BeautyZent",
    description: "Find salons, barbers, spas, and book online on BeautyZent.",
    start_url: "/explore",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0a1a3a",
    theme_color: "#f7f2ec",
    icons: [
      {
        src: "/explore-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/explore-icon-512.png",
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
