import { NextResponse } from "next/server";
import { assertDisplayAccess } from "@/lib/display-pin";
import { buildPromotionBoardPayload } from "@/lib/promotion-board";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      active: true,
      displayPinHash: true,
      displayPinSetAt: true,
      discountsEnabled: true,
      promoBoardEnabled: true,
      promoBoardIntervalSec: true,
      promoBoardSlideSec: true,
    },
  });
  if (!salon || !salon.active) {
    return NextResponse.json({ error: "Salon not found" }, { status: 404 });
  }

  const locked = await assertDisplayAccess(salon, req);
  if (locked) return locked;

  const rules = await prisma.promotionRule.findMany({
    where: { salonId: salon.id, enabled: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      type: true,
      name: true,
      enabled: true,
      discountBps: true,
      discountCents: true,
      minVisits: true,
      minSpendCents: true,
    },
  });

  const board = buildPromotionBoardPayload({
    enabled: salon.promoBoardEnabled && salon.discountsEnabled,
    intervalSec: salon.promoBoardIntervalSec || 90,
    defaultSlideSec: salon.promoBoardSlideSec || 8,
    salonName: salon.name,
    rules,
  });

  return NextResponse.json(board);
}
