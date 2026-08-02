import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const products = await prisma.product.findMany({
    where: { salonId: session.salonId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ products });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const product = await prisma.product.create({
    data: {
      salonId: session.salonId,
      name: body.name,
      description: body.description || null,
      sku: body.sku || null,
      priceCents: Math.round(Number(body.price) * 100),
      stockQty: Number(body.stockQty) || 0,
      active: body.active !== false,
    },
  });
  return NextResponse.json({ product });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const existing = await prisma.product.findFirst({
    where: { id: body.id, salonId: session.salonId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const product = await prisma.product.update({
    where: { id: body.id },
    data: {
      name: body.name ?? existing.name,
      description: body.description ?? existing.description,
      sku: body.sku ?? existing.sku,
      priceCents: body.price != null ? Math.round(Number(body.price) * 100) : existing.priceCents,
      stockQty: body.stockQty != null ? Number(body.stockQty) : existing.stockQty,
      active: body.active ?? existing.active,
    },
  });
  return NextResponse.json({ product });
}
