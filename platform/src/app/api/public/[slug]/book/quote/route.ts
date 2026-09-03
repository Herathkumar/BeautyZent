import { NextResponse } from "next/server";
import { getClientSessionForSalon } from "@/lib/client-auth";
import { evaluateCheckoutPromotions } from "@/lib/promotions";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const url = new URL(req.url);
  const serviceIds = [...new Set(url.searchParams.get("serviceIds")?.split(",").filter(Boolean) || [])];
  if (serviceIds.length === 0) {
    return NextResponse.json({ error: "serviceIds required" }, { status: 400 });
  }

  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: {
      id: true,
      active: true,
      loyaltyEnabled: true,
      discountsEnabled: true,
      loyaltyPointsPerDollar: true,
      loyaltyCentsPerPoint: true,
      loyaltyMaxRedeemPercent: true,
    },
  });
  if (!salon || !salon.active) {
    return NextResponse.json({ error: "Salon not found" }, { status: 404 });
  }

  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds }, salonId: salon.id, active: true },
    select: { id: true, priceCents: true },
  });
  if (services.length !== serviceIds.length) {
    return NextResponse.json({ error: "Invalid service" }, { status: 400 });
  }

  const subtotalCents = services.reduce((sum, s) => sum + s.priceCents, 0);
  const session = await getClientSessionForSalon(salon.id);

  let isMember = false;
  let visitCount = 0;
  let loyaltyPointsBalance = 0;

  if (session) {
    const [client, completed] = await Promise.all([
      prisma.client.findUnique({
        where: { id: session.clientId },
        select: { memberAt: true, loyaltyPoints: true },
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
      isMember = Boolean(client.memberAt);
      loyaltyPointsBalance = client.loyaltyPoints ?? 0;
      visitCount = completed;
    }
  }

  const rules = salon.discountsEnabled
    ? await prisma.promotionRule.findMany({
        where: { salonId: salon.id, enabled: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      })
    : [];

  const quote = evaluateCheckoutPromotions(
    subtotalCents,
    {
      loyaltyEnabled: salon.loyaltyEnabled,
      discountsEnabled: salon.discountsEnabled,
      loyaltyPointsPerDollar: salon.loyaltyPointsPerDollar,
      loyaltyCentsPerPoint: salon.loyaltyCentsPerPoint,
      loyaltyMaxRedeemPercent: salon.loyaltyMaxRedeemPercent,
    },
    rules,
    {
      isMember,
      visitCount,
      loyaltyPointsBalance,
      redeemPointsEnabled: false,
    }
  );

  return NextResponse.json({ quote });
}
