import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { linkServiceToAllStylists, syncAllServiceStylistLinks } from "@/lib/service-links";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const services = await prisma.service.findMany({
    where: { salonId: session.salonId },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { stylists: true } } },
  });
  return NextResponse.json({
    services: services.map((s) => ({
      ...s,
      stylistCount: s._count.stylists,
    })),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  // Repair: link any orphan services (e.g. created before auto-assign) to all stylists
  if (body.action === "syncStylists") {
    const linked = await syncAllServiceStylistLinks(session.salonId);
    return NextResponse.json({ ok: true, linked });
  }

  const priceNum = Number(body.price);
  const priceCents = Number.isFinite(priceNum) ? Math.round(priceNum * 100) : 2000;
  const categoryRaw = String(body.category || "WOMEN").toUpperCase();
  const category =
    categoryRaw === "MEN" || categoryRaw === "WOMEN" || categoryRaw === "OTHER"
      ? categoryRaw
      : "WOMEN";

  const service = await prisma.service.create({
    data: {
      salonId: session.salonId,
      name: body.name,
      description: body.description || null,
      category,
      durationMin: Number(body.durationMin) || 45,
      priceCents: priceCents > 0 ? priceCents : 2000,
      active: body.active !== false,
      sortOrder: Number(body.sortOrder) || 0,
    },
  });
  // New services must be assigned to stylists or online booking stops after step 1
  await linkServiceToAllStylists(session.salonId, service.id);
  return NextResponse.json({ service });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const existing = await prisma.service.findFirst({
    where: { id: body.id, salonId: session.salonId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const service = await prisma.service.update({
    where: { id: body.id },
    data: {
      name: body.name ?? existing.name,
      description: body.description ?? existing.description,
      category: body.category ?? existing.category,
      durationMin: body.durationMin != null ? Number(body.durationMin) : existing.durationMin,
      priceCents: body.price != null ? Math.round(Number(body.price) * 100) : existing.priceCents,
      active: body.active ?? existing.active,
      sortOrder: body.sortOrder != null ? Number(body.sortOrder) : existing.sortOrder,
    },
  });
  return NextResponse.json({ service });
}
