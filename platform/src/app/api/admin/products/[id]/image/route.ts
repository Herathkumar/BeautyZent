import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  decodeProductImageBase64,
  productImageUrl,
} from "@/lib/product-image";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.product.findFirst({
    where: { id, salonId: session.salonId },
    select: { id: true, name: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const decoded = decodeProductImageBase64(body.imageBase64, body.mimeType);
  if (!decoded.ok) {
    return NextResponse.json({ error: decoded.error }, { status: 400 });
  }

  const updated = await prisma.product.update({
    where: { id: existing.id },
    data: {
      imageData: decoded.bytes,
      imageMime: decoded.mime,
      imageUpdatedAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      imageMime: true,
      imageUpdatedAt: true,
    },
  });

  return NextResponse.json({
    product: {
      id: updated.id,
      name: updated.name,
      hasImage: true,
      imageMime: updated.imageMime,
      imageUpdatedAt: updated.imageUpdatedAt,
      imageUrl: productImageUrl({
        id: updated.id,
        hasImage: true,
        imageUpdatedAt: updated.imageUpdatedAt,
      }),
    },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.product.findFirst({
    where: { id, salonId: session.salonId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.product.update({
    where: { id: existing.id },
    data: {
      imageData: null,
      imageMime: null,
      imageUpdatedAt: null,
    },
  });

  return NextResponse.json({ ok: true });
}
