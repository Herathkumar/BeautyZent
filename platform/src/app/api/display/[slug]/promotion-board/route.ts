import { NextResponse } from "next/server";
import { assertDisplayAccess } from "@/lib/display-pin";
import { buildPromotionBoardPayload } from "@/lib/promotion-board";
import { prisma } from "@/lib/prisma";
import { normalizeStoreDisplaySurface } from "@/lib/store-displays";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const surface = normalizeStoreDisplaySurface(
    new URL(req.url).searchParams.get("surface"),
    "lounge"
  );

  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      active: true,
      displayPinHash: true,
      displayPinSetAt: true,
      discountsEnabled: true,
      promoBoardEnabled: true,
      loungePromoBoardEnabled: true,
      schedulerPromoBoardEnabled: true,
      loungeDisplayEnabled: true,
      schedulerDisplayEnabled: true,
      promoBoardIntervalSec: true,
      promoBoardShowSec: true,
      promoBoardSlideSec: true,
      loyaltyEnabled: true,
      loyaltyPointsPerDollar: true,
      loyaltyCentsPerPoint: true,
    },
  });
  if (!salon || !salon.active) {
    return NextResponse.json({ error: "Salon not found" }, { status: 404 });
  }

  const locked = await assertDisplayAccess(salon, req);
  if (locked) return locked;

  const surfaceEnabled =
    surface === "scheduler"
      ? salon.schedulerDisplayEnabled !== false
      : salon.loungeDisplayEnabled !== false;

  const surfacePromo =
    surface === "scheduler"
      ? salon.schedulerPromoBoardEnabled ?? salon.promoBoardEnabled
      : salon.loungePromoBoardEnabled ?? salon.promoBoardEnabled;

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
    enabled: Boolean(surfaceEnabled && surfacePromo && salon.discountsEnabled),
    intervalSec: salon.promoBoardIntervalSec || 90,
    showSec: salon.promoBoardShowSec || 24,
    defaultSlideSec: salon.promoBoardSlideSec || 8,
    salonName: salon.name,
    rules,
    loyaltyEnabled: salon.loyaltyEnabled,
    loyaltyPointsPerDollar: salon.loyaltyPointsPerDollar,
    loyaltyCentsPerPoint: salon.loyaltyCentsPerPoint,
  });

  return NextResponse.json(board);
}
