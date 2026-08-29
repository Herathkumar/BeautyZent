import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateProductImage,
  MAX_PRODUCT_IMAGE_BYTES,
  productImageAiConfigured,
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
    select: { id: true, name: true, description: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!productImageAiConfigured()) {
    return NextResponse.json(
      {
        error:
          "Image AI is not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.",
      },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const customPrompt =
    typeof body?.prompt === "string" && body.prompt.trim()
      ? body.prompt.trim().slice(0, 500)
      : null;

  const generated = await generateProductImage({
    name: existing.name,
    description: existing.description,
    customPrompt,
  });
  if (!generated.ok) {
    return NextResponse.json(
      { error: generated.error },
      { status: generated.status || 502 }
    );
  }

  if (generated.bytes.length > MAX_PRODUCT_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "Generated image was too large. Try again." },
      { status: 413 }
    );
  }

  const imageData: Uint8Array<ArrayBuffer> = generated.bytes;

  const updated = await prisma.product.update({
    where: { id: existing.id },
    data: {
      imageData,
      imageMime: generated.mime,
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
    model: generated.model,
  });
}
