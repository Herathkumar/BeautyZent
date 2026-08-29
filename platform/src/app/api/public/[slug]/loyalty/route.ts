import { NextResponse } from "next/server";
import { getClientSessionForSalon } from "@/lib/client-auth";
import { buildPromotionBoardPayload } from "@/lib/promotion-board";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      active: true,
      loyaltyEnabled: true,
      discountsEnabled: true,
      loyaltyPointsPerDollar: true,
      loyaltyCentsPerPoint: true,
      loyaltyMaxRedeemPercent: true,
      promoBoardSlideSec: true,
    },
  });
  if (!salon || !salon.active) {
    return NextResponse.json({ error: "Salon not found" }, { status: 404 });
  }

  const [session, rules] = await Promise.all([
    getClientSessionForSalon(salon.id),
    salon.discountsEnabled
      ? prisma.promotionRule.findMany({
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
        })
      : Promise.resolve([]),
  ]);

  let points: number | null = null;
  let isMember = false;
  let clientName: string | null = null;
  if (session) {
    const client = await prisma.client.findUnique({
      where: { id: session.clientId },
      select: { name: true, loyaltyPoints: true, memberAt: true },
    });
    if (client) {
      points = client.loyaltyPoints ?? 0;
      isMember = Boolean(client.memberAt);
      clientName = client.name;
    }
  }

  const board = buildPromotionBoardPayload({
    enabled: salon.discountsEnabled || salon.loyaltyEnabled,
    intervalSec: 90,
    showSec: 24,
    defaultSlideSec: salon.promoBoardSlideSec || 8,
    salonName: salon.name,
    rules,
    loyaltyEnabled: salon.loyaltyEnabled,
    loyaltyPointsPerDollar: salon.loyaltyPointsPerDollar,
    loyaltyCentsPerPoint: salon.loyaltyCentsPerPoint,
  });

  // Loyalty program slide is already in board when loyaltyEnabled; keep offer cards
  // for discount rules, and still surface loyalty program details separately.
  const offers = board.slides.filter((s) => s.type !== "LOYALTY");

  const redeemValueCents =
    points != null ? points * (salon.loyaltyCentsPerPoint || 5) : null;

  return NextResponse.json({
    salonName: salon.name,
    loyalty: {
      enabled: salon.loyaltyEnabled,
      points,
      isMember,
      clientName,
      pointsPerDollar: salon.loyaltyPointsPerDollar,
      centsPerPoint: salon.loyaltyCentsPerPoint,
      maxRedeemPercent: salon.loyaltyMaxRedeemPercent,
      redeemValueCents,
    },
    offers: {
      enabled: salon.discountsEnabled && offers.length > 0,
      items: offers.map((s) => ({
        id: s.id,
        type: s.type,
        name: s.name,
        label: s.thumbLabel,
        template: s.template,
      })),
    },
  });
}
