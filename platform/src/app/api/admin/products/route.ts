import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  decodeProductImageBase64,
  productImageUrl,
} from "@/lib/product-image";

function mapProduct(p: {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  priceCents: number;
  stockQty: number;
  active: boolean;
  imageMime: string | null;
  imageUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  salonId: string;
}) {
  const hasImage = Boolean(p.imageUpdatedAt && p.imageMime);
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    sku: p.sku,
    priceCents: p.priceCents,
    stockQty: p.stockQty,
    active: p.active,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    salonId: p.salonId,
    hasImage,
    imageUrl: productImageUrl({
      id: p.id,
      hasImage,
      imageUpdatedAt: p.imageUpdatedAt,
    }),
  };
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const products = await prisma.product.findMany({
    where: { salonId: session.salonId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      sku: true,
      priceCents: true,
      stockQty: true,
      active: true,
      imageMime: true,
      imageUpdatedAt: true,
      createdAt: true,
      updatedAt: true,
      salonId: true,
    },
  });
  return NextResponse.json({ products: products.map(mapProduct) });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  let imageFields: {
    imageData?: Uint8Array<ArrayBuffer>;
    imageMime?: string;
    imageUpdatedAt?: Date;
  } = {};
  if (body.imageBase64) {
    const decoded = decodeProductImageBase64(body.imageBase64, body.mimeType);
    if (!decoded.ok) {
      return NextResponse.json({ error: decoded.error }, { status: 400 });
    }
    imageFields = {
      imageData: decoded.bytes,
      imageMime: decoded.mime,
      imageUpdatedAt: new Date(),
    };
  }

  const product = await prisma.product.create({
    data: {
      salonId: session.salonId,
      name: body.name,
      description: body.description || null,
      sku: body.sku || null,
      priceCents: Math.round(Number(body.price) * 100),
      stockQty: Number(body.stockQty) || 0,
      active: body.active !== false,
      ...imageFields,
    },
    select: {
      id: true,
      name: true,
      description: true,
      sku: true,
      priceCents: true,
      stockQty: true,
      active: true,
      imageMime: true,
      imageUpdatedAt: true,
      createdAt: true,
      updatedAt: true,
      salonId: true,
    },
  });
  return NextResponse.json({ product: mapProduct(product) });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const existing = await prisma.product.findFirst({
    where: { id: body.id, salonId: session.salonId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let imageFields: {
    imageData?: Uint8Array<ArrayBuffer>;
    imageMime?: string;
    imageUpdatedAt?: Date;
  } = {};
  if (body.imageBase64) {
    const decoded = decodeProductImageBase64(body.imageBase64, body.mimeType);
    if (!decoded.ok) {
      return NextResponse.json({ error: decoded.error }, { status: 400 });
    }
    imageFields = {
      imageData: decoded.bytes,
      imageMime: decoded.mime,
      imageUpdatedAt: new Date(),
    };
  }

  const product = await prisma.product.update({
    where: { id: body.id },
    data: {
      name: body.name ?? existing.name,
      description: body.description ?? existing.description,
      sku: body.sku ?? existing.sku,
      priceCents: body.price != null ? Math.round(Number(body.price) * 100) : existing.priceCents,
      stockQty: body.stockQty != null ? Number(body.stockQty) : existing.stockQty,
      active: body.active ?? existing.active,
      ...imageFields,
    },
    select: {
      id: true,
      name: true,
      description: true,
      sku: true,
      priceCents: true,
      stockQty: true,
      active: true,
      imageMime: true,
      imageUpdatedAt: true,
      createdAt: true,
      updatedAt: true,
      salonId: true,
    },
  });
  return NextResponse.json({ product: mapProduct(product) });
}
