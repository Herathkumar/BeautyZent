import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const manifest = {
    name: "FHS Client App",
    short_name: "FHS Client",
    description:
      "Book your salon visit, manage appointments, and keep a photo look book of every visit.",
    start_url: `/book/${slug}`,
    scope: `/book/${slug}`,
    display: "standalone",
    orientation: "any",
    background_color: "#1a1418",
    theme_color: "#1a1418",
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
      {
        src: "/book-icon.svg",
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
