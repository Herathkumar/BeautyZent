import { NextResponse } from "next/server";
import { getClientSessionForSalon } from "@/lib/client-auth";
import { buildPromotionBoardPayload } from "@/lib/promotion-board";
import { prisma } from "@/lib/prisma";

type OfferProgress = {
  kind: "visits";
  current: number;
  target: number;
  remaining: number;
  /** True when the client's next visit is the qualifying visit. */
  nextVisitUnlocks: boolean;
  /** True when the exact milestone visit is already behind them. */
  passed: boolean;
};

function visitProgress(
  type: string,
  minVisits: number | null | undefined,
  visitCount: number | null
): OfferProgress | null {
  if (visitCount == null) return null;
  if (type === "FIRST_VISIT") {
    const target = 1;
    const remaining = Math.max(0, target - visitCount);
    return {
      kind: "visits",
      current: Math.min(visitCount, target),
      target,
      remaining,
      nextVisitUnlocks: visitCount === 0,
      passed: visitCount > 0,
    };
  }
  if (type === "VISIT_MILESTONE") {
    const target = Math.max(1, Math.round(minVisits || 0));
    if (!minVisits || target <= 0) return null;
    const remaining = Math.max(0, target - visitCount);
    return {
      kind: "visits",
      current: Math.min(visitCount, target),
      target,
      remaining,
      nextVisitUnlocks: visitCount + 1 === target,
      passed: visitCount >= target,
    };
  }
  return null;
}

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
  let visitCount: number | null = null;

  if (session) {
    const [client, completed] = await Promise.all([
      prisma.client.findUnique({
        where: { id: session.clientId },
        select: { name: true, loyaltyPoints: true, memberAt: true },
      }),
      prisma.appointment.count({
        where: {
          salonId: salon.id,
          clientId: session.clientId,
          status: "COMPLETED",
        },
      }),
    ]);
    if (client) {
      points = client.loyaltyPoints ?? 0;
      isMember = Boolean(client.memberAt);
      clientName = client.name;
      visitCount = completed;
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

  const offerSlides = board.slides.filter((s) => s.type !== "LOYALTY");
  const ruleById = new Map(rules.map((r) => [r.id, r]));

  const redeemValueCents =
    points != null ? points * (salon.loyaltyCentsPerPoint || 5) : null;

  return NextResponse.json({
    salonName: salon.name,
    loyalty: {
      enabled: salon.loyaltyEnabled,
      points,
      isMember,
      clientName,
      visitCount,
      pointsPerDollar: salon.loyaltyPointsPerDollar,
      centsPerPoint: salon.loyaltyCentsPerPoint,
      maxRedeemPercent: salon.loyaltyMaxRedeemPercent,
      redeemValueCents,
    },
    offers: {
      enabled: salon.discountsEnabled && offerSlides.length > 0,
      items: offerSlides.map((s) => {
        const rule = ruleById.get(s.id);
        return {
          id: s.id,
          type: s.type,
          name: s.name,
          label: s.thumbLabel,
          template: s.template,
          minVisits: rule?.minVisits ?? null,
          progress: visitProgress(s.type, rule?.minVisits, visitCount),
        };
      }),
    },
  });
}
