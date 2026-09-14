import { NextResponse } from "next/server";
import { getSalonLookImage } from "@/lib/salon-look-db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const side = new URL(req.url).searchParams.get("side") === "before" ? "before" : "after";

  const look = await getSalonLookImage(id);
  if (!look?.active) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = side === "before" ? look.beforeData : look.afterData;
  const mime = side === "before" ? look.beforeMime : look.afterMime;
  if (!data?.length) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  const body = Buffer.from(data);
  return new NextResponse(body, {
    headers: {
      "Content-Type": mime || "image/jpeg",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
