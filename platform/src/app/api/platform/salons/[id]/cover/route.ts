import { NextResponse } from "next/server";
import { getPlatformSession } from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";

const MAX_COVER_BYTES = 900_000;

type Ctx = { params: Promise<{ id: string }> };

/** Upload Explore marketplace cover for a business. */
export async function PUT(req: Request, { params }: Ctx) {
  const session = await getPlatformSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const salon = await prisma.salon.findUnique({ where: { id }, select: { id: true } });
  if (!salon) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body?.imageBase64) {
    return NextResponse.json({ error: "Cover image required" }, { status: 400 });
  }

  const raw = String(body.imageBase64).replace(/^data:[^;]+;base64,/, "");
  const decoded = Buffer.from(raw, "base64");
  if (!decoded.length) {
    return NextResponse.json({ error: "Image could not be read" }, { status: 400 });
  }
  if (decoded.length > MAX_COVER_BYTES) {
    return NextResponse.json(
      { error: "Image is too large. Try a smaller photo." },
      { status: 400 }
    );
  }

  const mime = String(body.mimeType || "image/jpeg").toLowerCase();
  if (!mime.startsWith("image/")) {
    return NextResponse.json({ error: "Image required" }, { status: 400 });
  }

  const bytes = new Uint8Array(decoded.byteLength);
  bytes.set(decoded);

  const updated = await prisma.salon.update({
    where: { id },
    data: {
      coverData: bytes,
      coverMime: mime === "image/png" ? "image/png" : "image/jpeg",
      coverUpdatedAt: new Date(),
    },
    select: { id: true, coverUpdatedAt: true },
  });

  return NextResponse.json({
    ok: true,
    coverUrl: `/api/public/cover/${updated.id}?t=${updated.coverUpdatedAt?.getTime() ?? Date.now()}`,
    message: "Explore cover saved. It will show on /explore for this business.",
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getPlatformSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const salon = await prisma.salon.findUnique({ where: { id }, select: { id: true } });
  if (!salon) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  await prisma.salon.update({
    where: { id },
    data: {
      coverData: null,
      coverMime: null,
      coverUpdatedAt: null,
    },
  });

  return NextResponse.json({
    ok: true,
    coverUrl: null,
    message: "Cover removed. Explore will use the default image.",
  });
}
